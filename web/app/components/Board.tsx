import clsx from "clsx";
import type { Tile } from "durable-objects";
import { TurtlePiece } from "./TurtlePiece";

type BoardProps = {
  board: Tile[];
};

export const Board = ({ board }: BoardProps) => {
  return (
    <div className="grid grid-cols-5 grid-rows-2 gap-2 border-4 lg:grid-cols-10 lg:grid-rows-1">
      {board.map((tile, i) => {
        const start = i === 0;
        const finish = i === board.length - 1;
        return (
          <ul
            key={i}
            className={clsx(
              "isolate flex h-72 flex-col-reverse items-center p-1 sm:h-96",
              {
                "justify-evenly bg-yellow-200 bg-[url('/patterns/diagonal-stripes.svg')]":
                  start,
                "bg-white bg-[url('/patterns/tiny-checkers.svg')]": finish,
                "bg-green-200 bg-[url('/patterns/texture.svg')] text-green-600":
                  !start && !finish,
              }
            )}
          >
            {tile.map((t, i) => {
              const depth = start ? 0 : i - (tile.length - 1);
              return (
                <li
                  key={t}
                  className={clsx(
                    "relative -mt-2 rounded-md bg-white px-1 shadow-md transition-colors duration-700",
                    {
                      "bg-slate-50": depth === -1,
                      "bg-slate-100": depth === -2,
                      "bg-slate-200": depth === -3,
                      "bg-slate-300": depth === -4,
                    }
                  )}
                >
                  <TurtlePiece turtle={t} />
                </li>
              );
            })}
          </ul>
        );
      })}
    </div>
  );
};
