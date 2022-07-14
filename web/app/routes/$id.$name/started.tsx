import type { LoaderFunction } from "@remix-run/cloudflare";
import { Transition } from "@headlessui/react";
import { useLoaderData } from "@remix-run/react";
import { clientMessage } from "app/helpers/socket";
import type { CloudflareDataFunctionArgs } from "app/types";
import clsx from "clsx";
import type { CardEffect, Turtle } from "durable-objects";
import invariant from "invariant";
import { useId } from "react";
import { useStartedState } from "../$id.$name";

type LoaderData = { self: string };

export const loader: LoaderFunction = ({
  params: { name },
}: CloudflareDataFunctionArgs): LoaderData => {
  invariant(name, "Should exist");
  return { self: decodeURIComponent(name) };
};

export default function Started() {
  const { self } = useLoaderData<LoaderData>();
  const [{ board, cards, turtle, turn, played }, socket] = useStartedState();

  const [playedTurtle, playedMove] = parseEffect(played?.[1] ?? "any+");

  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-11 divide-x-4 bg-green-50">
        {board.map((tile, i) => {
          return (
            <ul key={i} className="flex h-28 flex-col-reverse items-center p-1">
              {tile.map((t) => {
                return (
                  <li key={t}>
                    <TurtlePiece turtle={t} />
                  </li>
                );
              })}
            </ul>
          );
        })}
      </div>
      <p className="text-2xl">Waiting for {turn === self ? "you" : turn}</p>
      {played && (
        <div className="h-32 w-20">
          <CardPiece turtle={playedTurtle} move={playedMove} />
        </div>
      )}
      <div className="w-min rounded-md border p-2">
        <TurtlePiece turtle={turtle} />
      </div>

      <ul className="flex h-40 justify-center border py-2">
        {cards.map(([id, effect], i) => {
          const [turtle, move] = parseEffect(effect);

          return (
            <li
              key={id}
              className={clsx("absolute transform px-4 transition-transform", {
                "-translate-x-[200%]": i == 0,
                "-translate-x-full": i == 1,
                "translate-x-0": i == 2,
                "translate-x-full": i == 3,
                "translate-x-[200%]": i == 4,
              })}
            >
              <Transition
                show
                appear
                enter="transition-opacity duration-800 pointer-events-none"
                enterFrom="opacity-0"
                enterTo="opacity-100"
              >
                <button
                  className={clsx(
                    "group relative h-32 w-20",
                    turn === self ? "cursor-pointer" : "cursor-not-allowed"
                  )}
                  onClick={() => {
                    socket?.send(clientMessage(["play", i]));
                  }}
                >
                  <div className="absolute inset-0 transition-transform group-hover:-translate-y-1/4">
                    <CardPiece turtle={turtle} move={move} />
                  </div>
                </button>
              </Transition>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const parseEffect = (effect: CardEffect) => {
  const m = effect.match(/(\w+)(.+)/);
  invariant(m, "Will always match");

  return [
    m[1] as Turtle | "any",
    m[2] as "++" | "+" | "-" | "↑" | "↑↑",
  ] as const;
};

type CardPieceProps = {
  turtle: Turtle | "any";
  move: "++" | "+" | "-" | "↑" | "↑↑";
};

const CardPiece = ({ turtle, move }: CardPieceProps) => {
  return (
    <div
      className={clsx(
        {
          "from-red-500 group-hover:from-red-400": turtle === "red",
          "from-yellow-500 group-hover:from-yellow-400": turtle === "yellow",
          "from-purple-500 group-hover:from-purple-400": turtle === "purple",
          "from-green-500 group-hover:from-green-400": turtle === "green",
          "from-blue-500 group-hover:from-blue-400": turtle === "blue",
          "from-gray-500 group-hover:from-gray-400": turtle === "any",
        },
        "flex h-full w-full items-center justify-center rounded-md border border-black bg-gradient-to-b text-4xl shadow-md"
      )}
    >
      {move}
    </div>
  );
};

type TurtlePieceProps = {
  turtle: Turtle;
};

const TurtlePiece = ({ turtle }: TurtlePieceProps) => {
  const id = useId();
  return (
    <div
      className={clsx(
        {
          "text-red-500": turtle === "red",
          "text-yellow-500": turtle === "yellow",
          "text-purple-500": turtle === "purple",
          "text-green-500": turtle === "green",
          "text-blue-500": turtle === "blue",
        },
        "group relative select-none"
      )}
      aria-describedby={id}
    >
      ,=,e
      <div
        id={id}
        role="tooltip"
        className="pointer-events-none absolute top-0 hidden -translate-y-full transform rounded-md bg-black px-2 py-1 group-hover:block"
      >
        {turtle}
        <div className="absolute bottom-0 left-0 h-2 w-2 translate-x-full translate-y-1/2 rotate-45 transform bg-black"></div>
      </div>
    </div>
  );
};
