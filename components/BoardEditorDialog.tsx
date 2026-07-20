import Link from 'next/link';
import React from 'react';
import { useLocalStorage } from '../hooks/use-storage';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { PuyoPuyoLogo } from './PuyoPuyoLogo';

type SavedBoard = {
  id: string;
  /** Query-param encoding of the board — see BoardEditor's
   * serializeGridToQueryParam. */
  grid: string;
  savedAt: number;
};

const STORAGE_KEY = 'puyo-puyo-saved-boards';

type Props = {
  isActive?: boolean;
  onClose: () => void;
  /** Current board, encoded the same way as the ?grid= query param —
   * empty string if the board is currently blank. */
  currentGridQuery: string;
};

export const BoardEditorDialog: React.FC<Props> = ({
  isActive,
  onClose,
  currentGridQuery,
}) => {
  const [savedBoards, setSavedBoards] = useLocalStorage<SavedBoard[]>(
    STORAGE_KEY,
    [],
  );

  const handleSave = () => {
    if (!currentGridQuery) {
      return;
    }

    setSavedBoards([
      ...savedBoards,
      {
        id: `board-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        grid: currentGridQuery,
        savedAt: Date.now(),
      },
    ]);
  };

  const handleDelete = (id: string) => {
    setSavedBoards(savedBoards.filter((board) => board.id !== id));
  };

  return (
    <Dialog onClose={onClose} isActive={isActive}>
      <div className="space-y-4 text-stone-300">
        <PuyoPuyoLogo fontSize="1.4em" />

        <p>
          <Link href="/">
            <a onClick={onClose}>Game</a>
          </Link>{' '}
          |{' '}
          <Link href="/board-editor">
            <a onClick={onClose}>Board editor</a>
          </Link>
        </p>

        <button
          type="button"
          disabled={!currentGridQuery}
          onClick={handleSave}
          className="border border-stone-500 px-3 py-1.5 uppercase tracking-widest transition-colors hover:border-fuchsia-600 hover:text-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-500 disabled:hover:text-stone-300"
        >
          Save current board
        </button>

        <div>
          <h2 className="text-lg uppercase tracking-widest">Saved boards</h2>

          {savedBoards.length === 0 ? (
            <p className="text-stone-500">Nothing saved yet.</p>
          ) : (
            <ul className="space-y-1">
              {savedBoards
                .slice()
                .reverse()
                .map((board) => (
                  <li key={board.id} className="flex items-center gap-2">
                    <Link
                      href={`/board-editor?grid=${encodeURIComponent(
                        board.grid,
                      )}`}
                    >
                      <a onClick={onClose} className="flex-1">
                        {new Date(board.savedAt).toLocaleString()}
                      </a>
                    </Link>

                    <button
                      type="button"
                      aria-label="Delete saved board"
                      onClick={() => handleDelete(board.id)}
                      className="text-stone-500 transition-colors hover:text-red-500"
                    >
                      <Icon name="close" size="sm" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
};
