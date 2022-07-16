import { shuffle } from "prelude";
import { createSessions, DurableObjectTemplate } from "./helpers";

export type Turtle = "green" | "purple" | "blue" | "red" | "yellow";

export type Game = "waiting" | "started" | "starting" | "done";

export type CardEffect =
  | `${Turtle}++`
  | `${Turtle}+`
  | `${Turtle}-`
  | "any+"
  | "any-"
  | "any↑"
  | "any↑↑";

export type Card = [string, CardEffect];
export type Winner = [Turtle, string];
export type Tile = Turtle[];
export type Board = [Set<Turtle>, ...Tile[], Tile];
export type Player = [string, { turtle: Turtle; cards: Card[] }];

export type ClientMessage = ["start"] | ["latest"] | ["play", number, Turtle?];
export type ServerMessage =
  | ["error", string]
  | ["starting"]
  | [
      "started",
      { board: Tile[]; player: Player; turn: string; played: Card | undefined }
    ]
  | ["waiting", string[]]
  | ["reconnected", string]
  | ["joined", string]
  | ["cards", Card[]]
  | ["played", { board: Tile[]; card: Card; turn: string }]
  | ["done", { board: Tile[]; winners: Winner[] }];

const all = ["green", "purple", "blue", "red", "yellow"] as const;

export class TurtleGame extends DurableObjectTemplate {
  sessions: ReturnType<typeof createSessions>;
  game: Game;
  admin: string | undefined;
  deck: Card[];
  discard: Card[];
  waiting: Set<string>;
  current: number;
  players: Player[];
  played?: Card;
  winners: Winner[];
  board: Board;

  constructor(_state: DurableObjectState) {
    super();
    this.sessions = createSessions();
    this.game = "waiting";
    this.deck = makeDeck();
    this.discard = [];
    this.winners = [];
    this.admin = undefined;
    this.waiting = new Set();
    this.current = 0;
    this.players = [];
    this.board = [new Set(all), ...new Array(8).fill([]), []];
  }

  handleWaiting(websocket: WebSocket, name: string, [t]: ClientMessage) {
    switch (t) {
      case "start": {
        if (name !== this.admin) {
          websocket.send(serverMessage(["error", "not admin"]));
          return;
        }

        if (this.waiting.size < 2) {
          websocket.send(serverMessage(["error", "not enough players"]));
          return;
        }

        this.game = "started";
        const turtles = shuffle(all);
        this.waiting.forEach((player) => {
          const turtle = turtles.pop();
          if (turtle) {
            const cards = this.deck.splice(0, 5);
            this.players.push([player, { turtle, cards }]);
          }
        });
        this.players = shuffle(this.players);
        this.sessions.broadcast(serverMessage(["starting"]));
        return;
      }
      default: {
        websocket.send(serverMessage(["error", "invalid command"]));
      }
    }
  }

  handleStarted(
    websocket: WebSocket,
    name: string,
    [t, cardIndex, wildcard]: ClientMessage
  ) {
    switch (t) {
      case "latest": {
        const player = this.players.find((p) => p[0] === name);
        if (!player) {
          websocket.send(serverMessage(["error", "invalid user"]));
          websocket.close(1000, "invalid user");
          return;
        }

        websocket.send(
          serverMessage([
            "started",
            {
              board: serializeBoard(this.board),
              player,
              turn: this.players[this.current][0],
              played: this.played,
            },
          ])
        );
        break;
      }
      case "play": {
        const [playerName, player] = this.players[this.current];
        if (name !== playerName) return;

        const card = player.cards[cardIndex];
        if (!card) return;

        player.cards = removeCard(player.cards, cardIndex);
        player.cards = player.cards.concat(this.deck.splice(0, 1)); // Pickup card from deck

        this.board = playCard(this.board, card, wildcard);
        this.current = nextTurn(this.current, this.players);
        this.played = card;

        const winners = findWinners(this.board, this.players);

        websocket.send(serverMessage(["cards", player.cards]));
        this.sessions.broadcast(
          serverMessage([
            "played",
            {
              board: serializeBoard(this.board),
              card,
              turn: this.players[this.current][0],
            },
          ])
        );

        if (winners !== undefined) {
          this.winners = winners;
          this.game = "done";
          this.sessions.broadcast(
            serverMessage([
              "done",
              { board: serializeBoard(this.board), winners },
            ])
          );
        }
      }
    }
  }

  async connect(name: string) {
    return await this.sessions.connect({
      onConnect: (websocket) => {
        switch (this.game) {
          case "done": {
            websocket.send(
              serverMessage([
                "done",
                { board: serializeBoard(this.board), winners: this.winners },
              ])
            );

            break;
          }

          case "started": {
            const player = this.players.find((p) => p[0] === name);
            if (!player) {
              websocket.send(serverMessage(["error", "invalid user"]));
              websocket.close(1000, "invalid user");
              return;
            }

            websocket.send(
              serverMessage([
                "started",
                {
                  board: serializeBoard(this.board),
                  player,
                  turn: this.players[this.current][0],
                  played: this.played,
                },
              ])
            );
            break;
          }

          case "waiting": {
            websocket.send(serverMessage(["waiting", [...this.waiting]]));
            if (this.waiting.has(name)) {
              this.sessions.broadcast(serverMessage(["reconnected", name]));
              return;
            }
            if (this.waiting.size === 4) {
              websocket.send(serverMessage(["error", "full"]));
              websocket.close(1000, "server is full");
              return;
            }

            if (this.waiting.size === 0) {
              this.admin = name;
            }

            this.waiting.add(name);
            this.sessions.broadcast(serverMessage(["joined", name]));
          }
        }
      },
      onMessage: (websocket, message: MessageEvent) => {
        if (this.game === "done") {
          websocket.send(
            serverMessage([
              "done",
              { board: serializeBoard(this.board), winners: this.winners },
            ])
          );
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

const serializeBoard = ([first, ...rest]: Board): Tile[] => {
  return [[...first], ...rest];
};

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

/**
 * type guard to disambiguate a union of strings based on their endings
 *
 * @example
 *
 * ```ts
 * const str = "hello world" as "hello world" | "hello bye";
 * if (endsWith(str, "world")) {
 *  console.log(str) // str is of type "hello world"
 * }
 * ```
 */
const endsWith = <B extends string, A extends string>(
  value: B,
  ending: B extends `${string}${A}` ? A : never
): value is Extract<B, `${string}${A}`> => {
  return value.endsWith(ending);
};

const str = "hello world" as "hello world" | "hello bye";
if (endsWith(str, "world")) {
  console.log(str); // str is of type "hello world"
}

/**
 * function to remove the end of a string in a typed way
 *
 * @example
 *
 * ```ts
 * removeEnd("hello world", "world")
 *
 * // returns "hello " (typed as "hello ")
 * ```
 */
const removeEnd = <B extends `${string}${A}`, A extends string>(
  value: B,
  ending: A
) => {
  return value.slice(0, -ending.length) as B extends `${infer P}${A}`
    ? P
    : never;
};

/**
 * function to determining the moving and stay turtles when moving a specific turtle on a tileIndex
 *
 * This is similar to a `splitAt` function if you've ever used one before
 * @example
 * ```ts
 * pickupTurtle(["red", "blue", "green"], "blue")
 *
 * // returns [["red"], ["blue", "green"]]
 * ```
 */
const pickupTurtle = (
  tile: Tile,
  turtle: Turtle
): [moving: Tile, remaining: Tile] => {
  const turtleIndex = tile.indexOf(turtle);
  if (turtleIndex !== -1) return [[], tile];

  const moving = tile.slice(turtleIndex);
  const remaining = tile.slice(0, turtleIndex);
  return [moving, remaining];
};

/** function to determine if the given turtle is in (possibly shared) last place
 *
 * @example
 * ```ts
 * turtleLast([new Set(), ["red", "green"], ["blue"]], "red")
 * // returns true
 *
 * turtleLast([new Set(), ["red", "green"], ["blue"]], "green")
 * // returns true
 *
 * turtleLast([new Set(), ["red", "green"], ["blue"]], "blue")
 * // return false
 * ```
 */
const turtleLast = ([first, ...rest]: Board, turtle: Turtle) => {
  if (first.has(turtle)) return true;

  for (const tile of rest) {
    if (tile.length === 0) continue;
    return tile.includes(turtle);
  }

  return false;
};

/**
 * function to return winners on a board, if any, or undefined
 *
 * @example
 * ```ts
 * findWinners([new Set(), [], ["red"]], [["me", { turtle: "red", cards: [] }]])
 *
 * // returns [["red", "me"]]
 * ```
 */
const findWinners = (
  [_, ...rest]: Board,
  players: Player[]
): Winner[] | undefined => {
  const winners = rest[rest.length - 1]
    .map((turtle): Winner | undefined => {
      const player = players.find((p) => p[1].turtle === turtle);
      if (player === undefined) return undefined;
      return [turtle, player[0]];
    })
    .filter(exists);
  if (winners.length === 0) return undefined;
  return winners;
};

/**
 * function to apply the card effect to the board and return the updated board
 */
const playCard = (board: Board, [, effect]: Card, wildcard?: Turtle): Board => {
  switch (effect) {
    case "any+": {
      if (wildcard !== undefined) {
        return move(board, wildcard, 1);
      }
      break;
    }
    case "any-":
      if (wildcard !== undefined) {
        return move(board, wildcard, -1);
      }
      break;
    case "any↑":
      if (wildcard !== undefined && turtleLast(board, wildcard)) {
        return move(board, wildcard, 1);
      }
      break;
    case "any↑↑":
      if (wildcard !== undefined && turtleLast(board, wildcard)) {
        return move(board, wildcard, 2);
      }
      break;
    default: {
      if (endsWith(effect, "++")) {
        const color = removeEnd(effect, "++");
        return move(board, color, 2);
      }

      if (endsWith(effect, "+")) {
        const color = removeEnd(effect, "+");
        return move(board, color, 1);
      }

      if (endsWith(effect, "-")) {
        const color = removeEnd(effect, "-");
        return move(board, color, -1);
      }
    }
  }

  return board;
};

/**
 * function to increment the turn capped by the player length
 */
const nextTurn = (turn: number, players: Player[]) => {
  return (turn + 1) % players.length;
};

/** type guard to filter away nullable states */
const exists = <A>(a: A): a is NonNullable<A> => a !== null && a !== undefined;

/**
 * function to create unique ids, by just incrementing from 0
 */
const addId = (() => {
  let i = 0;
  return <T extends string>(t: T): [string, T] => [(i++).toString(), t];
})();

/**
 * function to make a new shuffled default deck
 *
 * 5 ${turtle}+ cards
 * 2 ${turtle}- cards
 * 1 ${turtle}++ card
 *
 * 5 any+ cards
 * 2 any- cards
 *
 * 3 any↑ cards
 * 2 any↑↑ cards
 */
const makeDeck = (): Card[] => {
  const colors: CardEffect[] = all
    .map((x) => {
      return [`${x}++` as const]
        .concat(new Array(5).fill(`${x}+` as const))
        .concat(new Array(2).fill(`${x}-` as const));
    })
    .flat();

  const any: CardEffect[] = new Array(5)
    .fill(`any+`)
    .concat(new Array(2).fill("any-"));
  const last: CardEffect[] = new Array(3)
    .fill(`any↑`)
    .concat(new Array(2).fill("any↑↑"));

  return shuffle(colors.concat(any).concat(last).map(addId));
};

/**
 * function to a card at a specific index in a hand of set_cards
 *
 * @example
 */
const removeCard = (cards: Card[], index: number) => {
  return cards.slice(0, index).concat(cards.slice(index + 1));
};

/**
 * function to properly type the incoming message before stringifying it
 */
const serverMessage = <M extends ServerMessage>(message: M) =>
  JSON.stringify(message);
