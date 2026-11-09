import { Chess, Color, PieceSymbol, Square } from "chess.js";
import { CSSProperties, useMemo, useRef, useState } from "react";

export type BoardState = ({ square: Square; type: PieceSymbol; color: Color } | null)[][];
export interface BoardMove { from: Square; to: Square; promotion?: string }

interface ChessBoardProps {
  chess: Chess;
  board: BoardState;
  playerColor?: 'white' | 'black';
  interactive?: boolean;
  onMove?: (move: BoardMove) => void;
  className?: string;
}

const FILES = 'abcdefgh';

export const ChessBoard = ({
  chess,
  board,
  playerColor = 'white',
  interactive = false,
  onMove,
  className = 'w-[min(92vw,600px)]'
}: ChessBoardProps) => {
  const [selected, setSelected] = useState<Square | null>(null);
  const flipped = playerColor === 'black';
  const myColor: Color = flipped ? 'b' : 'w';

  const history = chess.history({ verbose: true });
  const last = history[history.length - 1];

  // Animate a move only when history grows (not after an undo or reset).
  const seenLen = useRef(history.length);
  const animLen = useRef(-1);
  if (history.length > seenLen.current) animLen.current = history.length;
  seenLen.current = history.length;
  const animating = !!last && animLen.current === history.length;

  // Squares that slide this render: the moved piece, plus the rook when castling.
  const slides = new Map<Square, Square>();
  if (animating && last) {
    slides.set(last.to, last.from);
    const back = last.color === 'w' ? '1' : '8';
    if (last.flags.includes('k')) slides.set(`f${back}` as Square, `h${back}` as Square);
    if (last.flags.includes('q')) slides.set(`d${back}` as Square, `a${back}` as Square);
  }

  const targets = useMemo(() => {
    if (!selected) return [] as Square[];
    return chess.moves({ square: selected, verbose: true }).map((m) => m.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, selected, history.length]);

  let checkSquare: Square | null = null;
  if (chess.inCheck()) {
    const turn = chess.turn();
    board.forEach((row) => row.forEach((p) => {
      if (p && p.type === 'k' && p.color === turn) checkSquare = p.square;
    }));
  }

  const canAct = interactive && chess.turn() === myColor;

  const displayPos = (sq: Square) => {
    const file = sq.charCodeAt(0) - 97;
    const rank = Number(sq[1]);
    return { col: flipped ? 7 - file : file, row: flipped ? rank - 1 : 8 - rank };
  };

  const handleClick = (sq: Square, piece: BoardState[number][number]) => {
    if (!canAct) { setSelected(null); return; }
    if (piece && piece.color === myColor) {
      setSelected(sq === selected ? null : sq);
      return;
    }
    if (selected && targets.includes(sq)) {
      const move = { from: selected, to: sq, promotion: 'q' };
      try {
        chess.move(move);
        onMove?.(move);
      } catch {
        // chess.js rejected the move; drop the selection
      }
    }
    setSelected(null);
  };

  return (
    <div className={`relative aspect-square rounded-lg overflow-hidden board-shadow select-none ${className}`}>
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {Array.from({ length: 64 }, (_, idx) => {
          const row = Math.floor(idx / 8);
          const col = idx % 8;
          const file = flipped ? 7 - col : col;
          const rank = flipped ? row + 1 : 8 - row;
          const sq = `${FILES[file]}${rank}` as Square;
          const piece = board[8 - rank][file];
          const light = (file + rank) % 2 === 0; // a1 (0+1) is dark, h1 (7+1) is light
          const isTarget = targets.includes(sq);
          const slideFrom = slides.get(sq);
          const ownPiece = !!piece && piece.color === myColor;

          let slideStyle: CSSProperties | undefined;
          if (slideFrom) {
            const a = displayPos(slideFrom);
            const b = displayPos(sq);
            slideStyle = {
              '--dx': `${(a.col - b.col) * 100}%`,
              '--dy': `${(a.row - b.row) * 100}%`,
            } as CSSProperties;
          }

          return (
            <div
              key={sq}
              onClick={() => handleClick(sq, piece)}
              className={`relative ${light ? 'sq-light' : 'sq-dark'} ${canAct && (ownPiece || isTarget) ? 'cursor-pointer sq-hover' : ''}`}
            >
              {last && (last.from === sq || last.to === sq) && <div key={`l${history.length}`} className="sq-overlay sq-last" />}
              {selected === sq && <div className="sq-overlay sq-selected" />}
              {checkSquare === sq && <div className="sq-overlay sq-check" />}

              {col === 0 && (
                <span className={`coord left-[5%] top-[5%] ${light ? 'text-[var(--sq-dark)]' : 'text-[var(--sq-light)]'}`}>{rank}</span>
              )}
              {row === 7 && (
                <span className={`coord right-[5%] bottom-[5%] ${light ? 'text-[var(--sq-dark)]' : 'text-[var(--sq-light)]'}`}>{FILES[file]}</span>
              )}

              {piece && (
                <img
                  key={slideFrom ? `${sq}-${history.length}` : sq}
                  className={`piece ${slideFrom ? 'piece-slide' : ''} ${canAct && ownPiece ? 'piece-lift' : ''}`}
                  style={slideStyle}
                  src={`/${piece.color}${piece.type}.png`}
                  alt={`${piece.color === 'w' ? 'white' : 'black'} ${piece.type}`}
                  draggable={false}
                />
              )}

              {isTarget && (piece ? <div className="move-ring" /> : <div className="move-dot" />)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
