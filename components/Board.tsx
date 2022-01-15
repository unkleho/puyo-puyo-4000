import { useStore } from '../store/store';

type Props = {
  children: React.ReactNode;
};

export const Board: React.FunctionComponent<Props> = ({ children }) => {
  const grid = useStore((store) => store.grid);
  const cellSize = useStore((store) => store.cellSize);

  return (
    <div className="relative">
      <div className="bg-slate-800">
        {grid.map((columns, i) => {
          return (
            <div className="flex" key={i}>
              {columns.map((column, j) => {
                return (
                  <div
                    key={j}
                    className="outline-1 outline-slate-700 outline"
                    style={{
                      width: cellSize,
                      height: cellSize,
                    }}
                  ></div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="absolute top-0">{children}</div>
    </div>
  );
};
