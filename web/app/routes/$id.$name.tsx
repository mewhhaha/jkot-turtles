import { useEffect, useMemo, useReducer } from "react";
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

    case "init_done": {
      const { type: _, ...rest } = action;
      return { ...state, ...rest, type: "done" };
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

export default function IdName() {
  const { url, room } = useLoaderData<LoaderData>();

  const [state, dispatch] = useReducer(reducer, { type: "none" });
  const [socket] = useWebSocket(url, { reconnect: true, retries: 3 });
  const navigate = useNavigate();

  useEffect(() => {
    if (socket === undefined) return;
    socket.onmessage = (event) => {
      const [t, a0]: ServerMessage = JSON.parse(event.data);
      switch (t) {
        case "cards": {
          dispatch({ type: "set_cards", cards: a0 });
          return;
        }

        case "played": {
          dispatch({
            type: "update_board",
            board: a0.board,
            played: a0.card,
            turn: a0.turn,
          });
          return;
        }

        case "joined": {
          dispatch({ type: "add_waiting", joined: a0 });
          return;
        }

        case "waiting": {
          navigate("waiting", { replace: true });
          dispatch({ type: "init_waiting", waiting: a0 });

          return;
        }
        case "done": {
          navigate("done", { replace: true });
          dispatch({
            type: "init_done",
            board: a0.board,
            winners: a0.winners,
          });
          return;
        }

        case "started": {
          navigate("started", { replace: true });
          dispatch({
            type: "init_started",
            board: a0.board,
            cards: a0.player[1].cards,
            turtle: a0.player[1].turtle,
            played: a0.played,
            turn: a0.turn,
          });
          return;
        }

        case "starting": {
          socket?.send(clientMessage(["latest"]));
          return;
        }
      }
    };

    return () => {
      socket.onmessage = null;
    };
  }, [navigate, socket]);

  const context = useMemo(() => [state, socket], [socket, state]);
  return (
    <div className="flex h-[100vh] w-[100vw] flex-col">
      <main className="flex flex-grow justify-center py-4">
        <section className="flex w-full max-w-2xl flex-col space-y-4 px-10 lg:max-w-6xl">
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
