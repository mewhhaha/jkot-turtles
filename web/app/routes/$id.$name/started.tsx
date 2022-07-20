import type { LoaderFunction } from "@remix-run/cloudflare";
import { Transition } from "@headlessui/react";
import { useLoaderData } from "@remix-run/react";
import { clientMessage } from "app/helpers/socket";
import type { CloudflareDataFunctionArgs } from "app/types";
import clsx from "clsx";
import type { CardEffect, Tile, Turtle } from "durable-objects";
import invariant from "invariant";
import { useStartedState } from "../$id.$name";
import { turtles } from "app/helpers/turtle";
import { TurtlePiece } from "app/components/TurtlePiece";
import { CardPiece } from "app/components/CardPiece";
import { Board } from "app/components/Board";

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
      <Board board={board} />

      <p className="text-2xl">Waiting for {turn === self ? "you" : turn}</p>
      {played && (
        <div className="h-32 w-20">
          <CardPiece turtle={playedTurtle} move={playedMove} />
        </div>
      )}
      <div className="w-min rounded-md border p-2 shadow">
        <TurtlePiece turtle={turtle} />
      </div>

      <ul className="flex h-40 justify-center border py-2">
        {cards.map(([id, effect], i) => {
          const [turtle, move] = parseEffect(effect);

          const anyOptions =
            move === "↑" || move === "↑↑" ? getLastTurtles(board) : turtles;

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
                enter="transition-opacity duration-1000 pointer-events-none"
                enterFrom="opacity-0"
                enterTo="opacity-100"
              >
                {turtle === "any" ? (
                  <AnyCardButton disabled={turn !== self}>
                    <CardPiece turtle={turtle} move={move} />
                    <div className="absolute -inset-6 hidden transform flex-col space-y-2 overflow-y-auto rounded-md border border-gray-100 bg-white p-2 shadow-md group-focus-within:flex group-hover:flex">
                      {anyOptions.map((t) => {
                        return (
                          <button
                            key={t}
                            disabled={turn !== self}
                            className={clsx(
                              {
                                "text-red-500": t === "red",
                                "text-yellow-500": t === "yellow",
                                "text-purple-500": t === "purple",
                                "text-green-500": t === "green",
                                "text-blue-500": t === "blue",
                              },
                              turn !== self
                                ? "cursor-not-allowed"
                                : "cursor-pointer",
                              "rounded-md border px-2 py-1 hover:bg-gray-50"
                            )}
                            onClick={() => {
                              socket?.send(clientMessage(["play", i, t]));
                            }}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </AnyCardButton>
                ) : (
                  <CardButton
                    disabled={turn !== self}
                    onClick={() => {
                      socket?.send(clientMessage(["play", i]));
                    }}
                  >
                    <CardPiece turtle={turtle} move={move} />
                  </CardButton>
                )}
              </Transition>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type AnyCardButtonProps = {
  disabled?: boolean;
  children: React.ReactNode;
};

const AnyCardButton = ({ disabled, children }: AnyCardButtonProps) => {
  return (
    <div
      className={clsx(
        "group relative h-32 w-14 transition-opacity sm:w-20",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
    >
      <div className="absolute inset-0 transition-transform">{children}</div>
    </div>
  );
};

type CardButtonProps = {
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
};

const CardButton = ({ disabled, onClick, children }: CardButtonProps) => {
  return (
    <button
      disabled={disabled}
      className={clsx(
        "group relative h-32 w-14 transition-opacity sm:w-20",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 transition-transform group-hover:-translate-y-1/4">
        {children}
      </div>
    </button>
  );
};

const parseEffect = (effect: CardEffect) => {
  const m = effect.match(/(\w+)(.+)/);
  invariant(m, "Will always match");

  return [
    m[1] as Turtle | "any",
    m[2] as "++" | "+" | "-" | "↑" | "↑↑",
  ] as const;
};

const getLastTurtles = (board: Tile[]) => {
  return board.filter((t) => t.length !== 0)[0];
};
