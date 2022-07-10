import { useEffect, useState } from "react";
import type { LoaderFunction } from "@remix-run/cloudflare";
import { useWebSocket } from "../hooks/useWebSocket";
import type { CloudflareDataFunctionArgs } from "../types";
import { useLoaderData } from "@remix-run/react";
import invariant from "invariant";

type LoaderData = { url: string; name: string };

export const loader: LoaderFunction = ({
  context,
  params: { id, name },
}: CloudflareDataFunctionArgs): LoaderData => {
  invariant(id, "Should exist");
  invariant(name, "Should exist");

  return { url: `${context.WORKER_URL}/${id}`, name };
};

export const Id = () => {
  const { url } = useLoaderData<LoaderData>();
  const [messages, setMessages] = useState<string[]>([]);
  const [socket, status] = useWebSocket(url);

  useEffect(() => {
    socket.onmessage = (event) => {
      setMessages((p) => [...p, event.data]);
    };
  }, [socket]);
  return (
    <section className="flex flex-col">
      <h1>{status}</h1>
      <div>{messages.join("\n")}</div>
    </section>
  );
};
