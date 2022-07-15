import clsx from "clsx";
import type { Turtle } from "durable-objects";
import { useId } from "react";

type TurtlePieceProps = {
  turtle: Turtle;
};

export const TurtlePiece = ({ turtle }: TurtlePieceProps) => {
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
        className="pointer-events-none absolute top-0 z-50 hidden -translate-y-full transform rounded-md bg-black px-2 py-1 group-hover:block"
      >
        {turtle}
        <div className="absolute bottom-0 left-0 h-2 w-2 translate-x-full translate-y-1/2 rotate-45 transform bg-black"></div>
      </div>
    </div>
  );
};
