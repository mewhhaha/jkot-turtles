import { createSessions, DurableObjectTemplate, shuffle } from "./helpers";

export type Turtle = "green" | "purple" | "blue" | "red" | "yellow";

export type Game = "waiting" | "started" | "done";

export type Card =
  | `${Turtle}++`
  | `${Turtle}+`
  | `${Turtle}-`
  | "any+"
  | "any-"
  | "any↑"
  | "any↑↑";

export type Tile = Turtle[];
export type Board = [Set<Turtle>, ...Tile[]];

export type ClientMessage = ["start"] | ["play", number, Turtle?];
export type ServerMessage =
  | ["error", string]
  | ["game", "done"]
  | [
      "game",
      "started",
      { board: Board; player: [string, { turtle: Turtle; cards: Card[] }] }
    ]
  | ["game", "waiting", string[]]
  | ["reconnected", string]
  | ["joined", string];

const all = ["green", "purple", "blue", "red", "yellow"] as const;

const makeDeck = () => {
  const colors: Card[] = all
    .map((x) => {
      return [`${x}++` as const]
        .concat(new Array(5).fill(`${x}+` as const))
        .concat(new Array(2).fill(`${x}-` as const));
    })
    .flat();

  const any: Card[] = new Array(5)
    .fill(`any+`)
    .concat(new Array(2).fill("any-"));
  const last: Card[] = new Array(3)
    .fill(`any↑`)
    .concat(new Array(2).fill("any↑↑"));

  return shuffle(colors.concat(any).concat(last));
};

const removeCard = (cards: Card[], index: number) => {
  return cards.slice(0, index).concat(cards.slice(index + 1));
};

export class TurtleGame extends DurableObjectTemplate {
  sessions: ReturnType<typeof createSessions>;
  game: Game;
  admin: string | undefined;
  deck: Card[];
  discard: Card[];
  waiting: Set<string>;
  current: number;
  players: [string, { turtle: Turtle; cards: Card[] }][];
  board: Board;

  constructor(_state: DurableObjectState) {
    super();
    this.sessions = createSessions();
    this.game = "waiting";
    this.deck = makeDeck();
    this.discard = [];
    this.admin = undefined;
    this.waiting = new Set();
    this.current = 0;
    this.players = [];
    this.board = [new Set(all), ...new Array(10).fill([])];
  }

  playCard(card: Card, wildcard?: Turtle) {
    switch (card) {
      case "any+": {
        if (wildcard !== undefined) {
          this.board = move(this.board, wildcard, 1);
        }
        break;
      }
      case "any-":
        if (wildcard !== undefined) {
          this.board = move(this.board, wildcard, -1);
        }
        break;
      case "any↑":
        if (wildcard !== undefined && turtleLast(this.board, wildcard)) {
          this.board = move(this.board, wildcard, 1);
        }
        break;
      case "any↑↑":
        if (wildcard !== undefined && turtleLast(this.board, wildcard)) {
          this.board = move(this.board, wildcard, 2);
        }
        break;
      default: {
        if (endsWith(card, "++")) {
          const color = removeEnd(card, "++");
          this.board = move(this.board, color, 2);
        } else if (endsWith(card, "+")) {
          const color = removeEnd(card, "+");
          this.board = move(this.board, color, 1);
        } else if (endsWith(card, "-")) {
          const color = removeEnd(card, "-");
          this.board = move(this.board, color, -1);
        }
      }
    }
  }

  nextTurn() {
    this.current = (this.current + 1) % this.players.length;
  }

  handleWaiting(websocket: WebSocket, name: string, [t]: ClientMessage) {
    switch (t) {
      case "start": {
        if (name !== this.admin) {
          websocket.send(JSON.stringify(["error", "not admin"]));
          return;
        }

        if (this.waiting.size < 2) {
          websocket.send(JSON.stringify(["error", "not enough players"]));
          return;
        }

        this.game = "started";
        const turtles = shuffle(all);
        this.waiting.forEach((player) => {
          const turtle = turtles.pop();
          if (turtle) {
            const cards = this.deck.splice(5);
            this.players.push([player, { turtle, cards }]);
          }
        });
        this.players = shuffle(this.players);
        return;
      }
      default: {
        websocket.send(JSON.stringify(["error", "invalid command"]));
      }
    }
  }

  handleStarted(
    _websocket: WebSocket,
    name: string,
    [t, cardIndex, wildcard]: ClientMessage
  ) {
    switch (t) {
      case "play": {
        const player = this.players[this.current];
        if (name !== player[0]) return;

        const card = player[1].cards[cardIndex];
        if (!card) return;

        player[1].cards = removeCard(player[1].cards, cardIndex);
        player[1].cards = player[1].cards.concat(this.deck.splice(1)); // Pickup card from deck

        this.playCard(card, wildcard);
        this.nextTurn();
      }
    }
  }

  async connect(name: string) {
    return await this.sessions.connect({
      onConnect: (websocket) => {
        switch (this.game) {
          case "done": {
            websocket.send(JSON.stringify(["game", "done"]));
            websocket.close();
            break;
          }

          case "started": {
            const player = this.players.find((p) => p[0] === name);
            if (!player) {
              websocket.send(JSON.stringify(["error", "invalid user"]));
              websocket.close();
              return;
            }

            websocket.send(
              JSON.stringify(["game", "started", { board: this.board, player }])
            );
            break;
          }

          case "waiting": {
            websocket.send(
              JSON.stringify(["game", "waiting", [...this.waiting]])
            );
            if (this.waiting.has(name)) {
              this.sessions.broadcast(JSON.stringify(["reconnected", name]));
              return;
            }
            if (this.waiting.size === 4) {
              websocket.send(JSON.stringify(["error", "full"]));
              websocket.close();
              return;
            }

            if (this.waiting.size === 0) {
              this.admin = name;
            }

            this.waiting.add(name);
            this.sessions.broadcast(JSON.stringify(["joined", name]));
          }
        }
      },
      onMessage: (websocket, message: MessageEvent) => {
        if (this.game === "done") {
          websocket.send(JSON.stringify(["error", "done"]));
          websocket.close();
        }

        const msg = JSON.parse(message.data as string) as ClientMessage;

        if (this.game === "waiting") {
          this.handleWaiting(websocket, name, msg);
        }

        if (this.game === "started") {
          this.handleStarted(websocket, name, msg);
        }
      },
    });
  }
}

const move = (
  [f, ...rest]: Board,
  turtle: Turtle,
  moves: 2 | 1 | -1
): Board => {
  const first = new Set(f);

  type T =
    | ["stand_still"]
    | ["move_from_first"]
    | ["move_to_first", number]
    | ["move", number];

  const determine = (): T => {
    if (first.has(turtle)) {
      if (moves === -1) return ["stand_still"];
      return ["move_from_first"];
    }

    for (let i = 0; i < rest.length; i++) {
      const tile = rest[i];
      if (tile.includes(turtle)) {
        if (i + moves >= rest.length) return ["stand_still"];
        if (i + moves < 0) return ["move_to_first", i];
        return ["move", i];
      }
    }

    return ["stand_still"];
  };

  const [t, tileIndex] = determine();
  switch (t) {
    case "stand_still":
      break;
    case "move_from_first": {
      rest[moves - 1] = [...rest[moves - 1], turtle];
      first.delete(turtle);
      break;
    }
    case "move_to_first": {
      const [moving, remaining] = pickupTurtle(rest[tileIndex], turtle);
      rest[tileIndex] = remaining;
      moving.forEach((t) => {
        first.add(t);
      });
      break;
    }
    case "move": {
      const [moving, remaining] = pickupTurtle(rest[tileIndex], turtle);
      rest[tileIndex] = remaining;
      rest[tileIndex + moves] = [...rest[tileIndex + moves], ...moving];
      break;
    }
  }

  return [first, ...rest];
};

const endsWith = <B extends string, A extends string>(
  value: B,
  ending: B extends `${string}${A}` ? A : never
): value is Extract<B, `${string}${A}`> => {
  return value.endsWith(ending);
};

const removeEnd = <B extends `${string}${A}`, A extends string>(
  value: B,
  ending: A
) => {
  return value.slice(0, -ending.length) as B extends `${infer P}${A}`
    ? P
    : never;
};

const pickupTurtle = (tile: Tile, turtle: Turtle) => {
  const turtleIndex = tile.indexOf(turtle);
  const moving = tile.slice(turtleIndex);
  const remaining = tile.slice(0, turtleIndex);
  return [moving, remaining];
};

const turtleLast = ([first, ...rest]: Board, turtle: Turtle) => {
  if (first.has(turtle)) return true;

  for (const tile of rest) {
    if (tile.length === 0) continue;
    return tile.includes(turtle);
  }

  return false;
};
