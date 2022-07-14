import type { CloudflareDataFunctionArgs } from "app/types";
import invariant from "invariant";
import type { LoaderFunction } from "remix";
import { useLoaderData } from "@remix-run/react";
import { useWaitingContext } from "../$id.$name";
import clsx from "clsx";
import { clientMessage } from "app/helpers/socket";

type LoaderData = { self: string };

export const loader: LoaderFunction = ({
  params: { name },
}: CloudflareDataFunctionArgs): LoaderData => {
  invariant(name, "Should exist");
  return { self: decodeURIComponent(name) };
};

export default function Waiting() {
  const { self } = useLoaderData<LoaderData>();
  const [{ waiting }, socket] = useWaitingContext();

  const handleOnStart = () => {
    socket?.send(clientMessage(["start"]));
  };

  return (
    <div className="space-y-4">
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
          className="w-full rounded-md border py-2 px-4 text-xl hover:bg-gray-50"
        >
          Start
        </button>
      )}
    </div>
  );
}
