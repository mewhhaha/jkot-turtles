import type { CloudflareDataFunctionArgs } from "app/types";
import invariant from "invariant";
import type { LoaderFunction } from "remix";
import { useLoaderData } from "@remix-run/react";
import { useWaitingContext } from "../$id.$name";
import clsx from "clsx";
import { clientMessage } from "app/helpers/socket";

type LoaderData = { room: string; self: string };

export const loader: LoaderFunction = ({
  params: { id, name },
}: CloudflareDataFunctionArgs): LoaderData => {
  invariant(id, "Should exist");
  invariant(name, "Should exist");
  return { room: id, self: decodeURIComponent(name) };
};

export default function Waiting() {
  const { self, room } = useLoaderData<LoaderData>();
  const [{ waiting }, socket] = useWaitingContext();

  const handleOnStart = () => {
    socket?.send(clientMessage(["start"]));
  };

  return (
    <section className="flex w-full flex-col space-y-4">
      <h1 className="bg-gradient-to-tl from-orange-300 to-purple-700 bg-clip-text text-6xl font-extrabold tracking-wide text-transparent">
        {room}
      </h1>
      <hr />
      <ul className="flex flex-col space-y-2">
        {waiting.map((name) => {
          return (
            <li
              className={clsx(
                "bg-gradient-to-r p-4 font-serif text-3xl font-extrabold tracking-wide",
                self === name ? "from-blue-50" : "from-red-50"
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
