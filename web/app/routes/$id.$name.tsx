import { useEffect, useMemo, useReducer, useState } from "react";
import type { LoaderFunction } from "@remix-run/cloudflare";
import { useWebSocket } from "../hooks/useWebSocket";
import type { CloudflareDataFunctionArgs } from "../types";
import {
  Outlet,
  useLoaderData,
  useNavigate,
  useOutletContext,
} from "@remix-run/react";
import type {
  Card,
  ServerMessage,
  Tile,
  Turtle,
  Winner,
} from "durable-objects";
import invariant from "invariant";
import { clientMessage } from "app/helpers/socket";

type LoaderData = { url: string; name: string; room: string };

export const loader: LoaderFunction = ({
  context,
  params: { id, name },
}: CloudflareDataFunctionArgs): LoaderData => {
  invariant(id, "Should exist");
  invariant(name, "Should exist");

  return { url: `wss://${context.WORKER_URL}/${id}/${name}`, name, room: id };
};

type From<Previous, Current> = Partial<Omit<Previous, "type">> & Current;

type EmptyState = { type: "none" };
type WaitingState = From<EmptyState, { type: "waiting"; waiting: string[] }>;
type StartedState = From<
  WaitingState,
  {
    type: "started";
    board: Tile[];
    cards: Card[];
    played?: Card;
    turtle: Turtle;
    turn: string;
  }
>;

type DoneState = From<
  StartedState,
  { type: "done"; board: Tile[]; winners: Winner[] }
>;

type State = EmptyState | WaitingState | StartedState | DoneState;

type Action =
  | { type: "init_waiting"; waiting: string[] }
  | { type: "add_waiting"; joined: string }
  | {
      type: "init_started";
      board: Tile[];
      cards: Card[];
      turtle: Turtle;
      turn: string;
      played?: Card;
    }
  | { type: "set_cards"; cards: Card[] }
  | { type: "update_board"; board: Tile[]; played: Card; turn: string }
  | { type: "init_done"; board: Tile[]; winners: Winner[] };

export const useWaitingContext = useOutletContext<
  [WaitingState, WebSocket | undefined]
>;
export const useStartedState = useOutletContext<
  [StartedState, WebSocket | undefined]
>;
export const useDoneState = useOutletContext<
  [DoneState, WebSocket | undefined]
>;

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "init_waiting": {
      return { ...state, type: "waiting", waiting: action.waiting };
    }

    case "init_started": {
      const { type: _, ...rest } = action;
      return { ...state, ...rest, type: "started" };
    }
  }

  if (state.type === "waiting") {
    switch (action.type) {
      case "add_waiting": {
        return { ...state, waiting: [...state.waiting, action.joined] };
      }
    }
  }

  if (state.type === "started") {
    switch (action.type) {
      case "set_cards": {
        return { ...state, cards: action.cards };
      }
      case "update_board": {
        const { type: _, ...rest } = action;
        return { ...state, ...rest };
      }
    }
  }

  return state;
};

export default function Id() {
  const { url, room } = useLoaderData<LoaderData>();
  const [messages, setMessages] = useState<string[]>([]);

  const [state, dispatch] = useReducer(reducer, { type: "none" });
  const [socket, status] = useWebSocket(url, { reconnect: true, retries: 3 });
  const navigate = useNavigate();

  useEffect(() => {
    if (socket === undefined) return;
    socket.onmessage = (event) => {
      setMessages((p) => [...p, event.data]);

      const [t, a0, a1]: ServerMessage = JSON.parse(event.data);
      switch (t) {
        case "cards": {
          dispatch({ type: "set_cards", cards: a0 });
          break;
        }

        case "played": {
          dispatch({
            type: "update_board",
            board: a0.board,
            played: a0.card,
            turn: a0.turn,
          });
          break;
        }

        case "joined": {
          dispatch({ type: "add_waiting", joined: a0 });
          break;
        }

        case "done": {
          dispatch({
            type: "init_done",
            board: a0.board,
            winners: a0.winners,
          });
          return;
        }

        case "game": {
          if (a0 === "waiting") dispatch({ type: "init_waiting", waiting: a1 });

          if (a0 === "done")
            dispatch({
              type: "init_done",
              board: a1.board,
              winners: a1.winners,
            });

          if (a0 === "started")
            dispatch({
              type: "init_started",
              board: a1.board,
              cards: a1.player[1].cards,
              turtle: a1.player[1].turtle,
              played: a1.played,
              turn: a1.turn,
            });

          if (a0 === "starting") socket?.send(clientMessage(["latest"]));

          if (a0 !== "starting") navigate(a0, { replace: true });
          break;
        }
      }
    };

    return () => {
      socket.onmessage = null;
    };
  }, [navigate, socket]);

  useEffect(() => {
    console.log(status);
    console.log(messages);
  }, [messages, status]);

  const context = useMemo(() => [state, socket], [socket, state]);
  return (
    <div className="flex h-[100vh] w-[100vw] flex-col">
      <header>
        <h1 className="w-full p-4 pt-12 text-center text-4xl font-extrabold tracking-wider">
          Turtles game
        </h1>
      </header>
      <main className="flex flex-grow justify-center pt-32">
        <section className="flex w-full max-w-2xl flex-col space-y-4 px-10">
          <h1 className="bg-gradient-to-tl from-orange-300 to-purple-700 bg-clip-text text-6xl font-extrabold tracking-wide text-transparent">
            {room}
          </h1>
          <hr />
          {state.type !== "none" && <Outlet context={context} />}
        </section>
      </main>
    </div>
  );
}
