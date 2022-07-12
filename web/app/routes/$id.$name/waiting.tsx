import type { CloudflareDataFunctionArgs } from "app/types";
import invariant from "invariant";
import type { LoaderFunction } from "remix";
import { useLoaderData } from "@remix-run/react";
import { useWaitingContext } from "../$id.$name";
import clsx from "clsx";
import type { ClientMessage } from "durable-objects";

type LoaderData = { self: string };

export const loader: LoaderFunction = ({
  params: { name },
}: CloudflareDataFunctionArgs): LoaderData => {
  invariant(name, "Should exist");
  return { self: name };
};

export default function Waiting() {
  const { self } = useLoaderData<LoaderData>();
  const [{ waiting }, socket] = useWaitingContext();

  const handleOnStart = () => {
    const message: ClientMessage = ["start"];
    socket?.send(JSON.stringify(message));
  };

  return (
    <section className="flex w-full flex-col space-y-4">
      <h1 className="mb-2 text-4xl">Lobby</h1>
      <ul className="flex flex-col space-y-2">
        {waiting.map((name) => {
          return (
            <li
              className={clsx(
                "rounded-md border p-4 font-serif text-3xl font-extrabold tracking-wide",
                self === name ? "bg-blue-50" : "bg-red-50"
              )}
              key={name}
            >
              {self === name ? "🙂 " : "🙃 "}
              {name}
            </li>
          );
        })}
      </ul>
      {waiting[0] === self && (
        <button
          onClick={handleOnStart}
          className="rounded-md border p-2 text-xl hover:bg-gray-200"
        >
          Start
        </button>
      )}
    </section>
  );
}
