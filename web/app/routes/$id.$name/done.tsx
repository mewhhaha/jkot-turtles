import { TurtlePiece } from "app/components/TurtlePiece";
import { useDoneState } from "../$id.$name";

export default function Done() {
  const [{ board, winners }] = useDoneState();
  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-10 divide-x-4 bg-green-50">
        {board.map((tile, i) => {
          return (
            <ul key={i} className="flex h-32 flex-col-reverse items-center p-1">
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
      <div>
        {winners.map(([turtle, name]) => {
          return (
            <div key={turtle}>
              <TurtlePiece turtle={turtle} />
              <label className="text-lg font-bold">{name}</label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
