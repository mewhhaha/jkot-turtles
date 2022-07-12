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
import type { Board, Card, ServerMessage, Turtle } from "durable-objects";
import invariant from "invariant";

type LoaderData = { url: string; name: string };

export const loader: LoaderFunction = ({
  context,
  params: { id, name },
}: CloudflareDataFunctionArgs): LoaderData => {
  invariant(id, "Should exist");
  invariant(name, "Should exist");

  return { url: `wss://${context.WORKER_URL}/${id}/${name}`, name };
};

type WaitingState = { type: "waiting"; waiting: string[] };
type StartedState = {
  type: "started";
  board: Board;
  cards: Card[];
  turtle: Turtle;
};

type State =
  | {
      type: "none";
    }
  | WaitingState
  | StartedState;

type Action =
  | { type: "init_waiting"; waiting: string[] }
  | { type: "add_waiting"; joined: string }
  | { type: "init_started"; board: Board; cards: Card[]; turtle: Turtle };

export const useWaitingContext = useOutletContext<
  [WaitingState, WebSocket | undefined]
>;
export const useStartedState = useOutletContext<
  [StartedState, WebSocket | undefined]
>;

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "init_waiting": {
      return { type: "waiting", waiting: action.waiting };
    }

    case "init_started": {
      return {
        type: "started",
        board: action.board,
        cards: action.cards,
        turtle: action.turtle,
      };
    }
  }

  if (state.type === "waiting") {
    switch (action.type) {
      case "add_waiting": {
        return { ...state, waiting: [...state.waiting, action.joined] };
      }
    }
  }

  return state;
};

export default function Id() {
  const { url } = useLoaderData<LoaderData>();
  const [messages, setMessages] = useState<string[]>([]);

  const [socket, status] = useWebSocket(url);
  const [state, dispatch] = useReducer(reducer, { type: "none" });
  const navigate = useNavigate();

  useEffect(() => {
    if (socket === undefined) return;
    socket.onmessage = (event) => {
      setMessages((p) => [...p, event.data]);

      const [t, a0, a1]: ServerMessage = JSON.parse(event.data);
      switch (t) {
        case "joined": {
          dispatch({ type: "add_waiting", joined: a0 });
          break;
        }
        case "game": {
          if (a0 === "waiting") dispatch({ type: "init_waiting", waiting: a1 });

          if (a0 === "started")
            dispatch({
              type: "init_started",
              board: a1.board,
              cards: a1.player[1].cards,
              turtle: a1.player[1].turtle,
            });

          navigate(a0, { replace: true });

          break;
        }
      }
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
        <section className="flex w-full max-w-2xl flex-col px-10">
          {state.type !== "none" && <Outlet context={context} />}
        </section>
      </main>
    </div>
  );
}
