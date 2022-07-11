import { useEffect, useState } from "react";
import type { LoaderFunction } from "@remix-run/cloudflare";
import { useWebSocket } from "../hooks/useWebSocket";
import type { CloudflareDataFunctionArgs } from "../types";
import { useLoaderData } from "@remix-run/react";
import type { Game, ServerMessage } from "durable-objects";
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

export default function Id() {
  const { url, name } = useLoaderData<LoaderData>();
  const [messages, setMessages] = useState<string[]>([]);
  const [game, setGame] = useState<Game>();
  const [socket, status] = useWebSocket(url);

  useEffect(() => {
    if (socket === undefined) return;
    socket.onmessage = (event) => {
      setMessages((p) => [...p, event.data]);

      const [t, a0]: ServerMessage = JSON.parse(event.data);
      switch (t) {
        case "game": {
          setGame(a0);
          break;
        }
      }
    };
  }, [socket]);

  return (
    <section className="flex flex-col">
      <h1>{status}</h1>
      <p>{name}</p>
      <div>{messages.join("\n")}</div>
      {game === "waiting" && <Waiting />}
      {game === "started" && <Started />}
      {game === "done" && <Done />}
    </section>
  );
}

const Waiting = () => {
  return <>Waiting</>;
};

const Started = () => {
  return <>Started</>;
};

const Done = () => {
  return <>Done</>;
};
