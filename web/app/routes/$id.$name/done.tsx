import { Board } from "app/components/Board";
import { TurtlePiece } from "app/components/TurtlePiece";
import clsx from "clsx";
import { useDoneState } from "../$id.$name";

export default function Done() {
  const [{ board, winners }] = useDoneState();
  return (
    <div className="flex flex-col space-y-4">
      <Board board={board} />
      <ol className="space-y-4">
        {winners.map(([turtle, name], i) => {
          const first = i === 0;
          const second = i === 1;
          const third = i === 2;
          const rest = i > 2;
          const placement = i + 1;

          return (
            <li key={turtle} className="flex items-center space-x-4">
              <div className="rounded-md border px-2 py-1 shadow">
                <TurtlePiece turtle={turtle} />
              </div>
              <div className="flex h-10 w-10 items-center justify-center">
                <span
                  className={clsx(
                    "flex items-center justify-center rounded-full border-2 ring-2 ring-gray-400",
                    {
                      "h-10 w-10 border-yellow-800 bg-yellow-400 text-2xl text-white":
                        first,
                      "h-8 w-8": !first,
                      "border-gray-800 bg-gray-400 text-xl text-white": second,
                      "border-orange-800 bg-orange-700/90 text-lg text-white":
                        third,
                      "border-gray-200 bg-white text-base text-gray-600": rest,
                    }
                  )}
                >
                  {placement}
                </span>
              </div>

              <label
                className={clsx({
                  "text-4xl font-extrabold text-black": first,
                  "text-3xl font-bold text-gray-700": !first,
                })}
              >
                {name}
              </label>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
