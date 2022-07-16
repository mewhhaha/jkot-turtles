import clsx from "clsx";
import type { Turtle } from "durable-objects";
import { useId } from "react";
import { TurtleIcon } from "./TurtleIcon";

type TurtlePieceProps = {
  turtle: Turtle;
};

export const TurtlePiece = ({ turtle }: TurtlePieceProps) => {
  const id = useId();
  return (
    <div
      className={clsx(
        {
          "text-red-700": turtle === "red",
          "text-yellow-700": turtle === "yellow",
          "text-purple-700": turtle === "purple",
          "text-green-700": turtle === "green",
          "text-blue-700": turtle === "blue",
        },
        "group relative select-none"
      )}
      aria-describedby={id}
    >
      <TurtleIcon className="mx-1 h-12 w-12 -scale-x-100 sm:mx-2 sm:h-16 sm:w-16" />
      <div
        id={id}
        role="tooltip"
        className="pointer-events-none absolute top-0 z-50 hidden -translate-y-full transform rounded-md bg-black px-2 py-1 group-hover:block"
      >
        {turtle}
        <div className="absolute bottom-0 left-0 h-2 w-2 translate-x-full translate-y-1/2 rotate-45 transform bg-black"></div>
      </div>
    </div>
  );
};
