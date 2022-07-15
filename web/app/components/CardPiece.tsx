import clsx from "clsx";
import type { Turtle } from "durable-objects";

type CardPieceProps = {
  turtle: Turtle | "any";
  move: "++" | "+" | "-" | "↑" | "↑↑";
};

export const CardPiece = ({ turtle, move }: CardPieceProps) => {
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
