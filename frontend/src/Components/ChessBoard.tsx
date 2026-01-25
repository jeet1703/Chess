import { Chess, Color, PieceSymbol, Square } from "chess.js";
import { useState, useMemo } from "react";
import { MOVE } from "../screens/Game";

interface ChessBoardProps {
  chess: Chess;
  setBoard: React.Dispatch<
    React.SetStateAction<
      ({
        square: Square;
        type: PieceSymbol;
        color: Color;
      } | null)[][]
    >
  >;
  board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][];
  socket: WebSocket;
  playerColor?: 'white' | 'black';
}

export const ChessBoard = ({
  chess,
  board,
  socket,
  setBoard,
  playerColor = 'white'
}: ChessBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // File and rank labels - flip based on player color
  const files = playerColor === 'white'
    ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const ranks = playerColor === 'white'
    ? ['8', '7', '6', '5', '4', '3', '2', '1']
    : ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Get the board in correct orientation
  const displayBoard = useMemo(() => {
    if (playerColor === 'black') {
      // Reverse both rows and columns for black player
      return board.map(row => [...row].reverse()).reverse();
    }
    return board;
  }, [board, playerColor]);

  // Calculate valid moves for selected piece
  const validMoves = useMemo(() => {
    if (!selectedSquare) return [];
    const moves = chess.moves({ square: selectedSquare, verbose: true });
    return moves.map(move => move.to);
  }, [chess, selectedSquare]);

  const handleSquareClick = (squareRepresentation: Square, piece: { color: Color; type: PieceSymbol } | null) => {
    // Check if it's player's turn
    const isMyTurn = (chess.turn() === 'w' && playerColor === 'white') ||
      (chess.turn() === 'b' && playerColor === 'black');

    if (!selectedSquare) {
      // Only allow selecting own pieces and only on player's turn
      if (piece && isMyTurn &&
        ((playerColor === 'white' && piece.color === 'w') ||
          (playerColor === 'black' && piece.color === 'b'))) {
        setSelectedSquare(squareRepresentation);
      }
    } else {
      // If clicking on own piece, change selection
      if (piece &&
        ((playerColor === 'white' && piece.color === 'w') ||
          (playerColor === 'black' && piece.color === 'b'))) {
        setSelectedSquare(squareRepresentation);
        return;
      }

      // Attempt move
      const move = {
        from: selectedSquare,
        to: squareRepresentation,
        promotion: 'q' // Default to queen promotion
      };

      // Try the move locally first to validate
      try {
        const result = chess.move(move);
        if (result) {
          // Valid move - send to server
          socket.send(
            JSON.stringify({
              type: MOVE,
              payload: { move }
            })
          );
          setLastMove({ from: selectedSquare, to: squareRepresentation });
          setBoard(chess.board());
        }
      } catch (e) {
        // Invalid move - just reset selection
        console.log("Invalid move attempted");
      }

      setSelectedSquare(null);
    }
  };

  const isSquareSelected = (square: Square) => selectedSquare === square;
  const isLastMoveSquare = (square: Square) =>
    lastMove && (lastMove.from === square || lastMove.to === square);
  const isValidMoveSquare = (square: Square) => validMoves.includes(square);

  // Calculate square representation based on display position
  const getSquareRepresentation = (displayRow: number, displayCol: number): Square => {
    if (playerColor === 'black') {
      // For black, we need to map back from flipped display coordinates
      const actualRow = 7 - displayRow;
      const actualCol = 7 - displayCol;
      return (String.fromCharCode(97 + actualCol) + (8 - actualRow)) as Square;
    }
    return (String.fromCharCode(97 + displayCol) + (8 - displayRow)) as Square;
  };

  return (
    <div className="flex flex-col items-center animate-fade-in">
      {/* Board container with shadow and border */}
      <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-slate-700">
        {/* Top file labels */}
        <div className="flex bg-slate-800">
          <div className="w-6"></div> {/* Corner spacer */}
          {files.map((file) => (
            <div key={file} className="w-14 h-6 flex items-center justify-center text-slate-400 text-sm font-medium">
              {file}
            </div>
          ))}
          <div className="w-6"></div>
        </div>

        {/* Board rows */}
        {displayBoard.map((row, i) => (
          <div key={i} className="flex">
            {/* Left rank label */}
            <div className="w-6 h-14 flex items-center justify-center text-slate-400 text-sm font-medium bg-slate-800">
              {ranks[i]}
            </div>

            {/* Squares */}
            {row.map((square, j) => {
              const squareRepresentation = getSquareRepresentation(i, j);

              // Determine if square should be light or dark based on actual position
              const actualRow = playerColor === 'black' ? 7 - i : i;
              const actualCol = playerColor === 'black' ? 7 - j : j;
              const isLight = (actualRow + actualCol) % 2 === 0;

              const isSelected = isSquareSelected(squareRepresentation);
              const isLastMove = isLastMoveSquare(squareRepresentation);
              const isValidMove = isValidMoveSquare(squareRepresentation);

              return (
                <div
                  onClick={() => handleSquareClick(squareRepresentation, square)}
                  key={j}
                  className={`
                    w-14 h-14 flex items-center justify-center cursor-pointer
                    transition-all duration-150 relative
                    ${isLight ? 'square-light' : 'square-dark'}
                    ${isSelected ? 'square-selected' : ''}
                    ${isLastMove && !isSelected ? 'square-highlight' : ''}
                    hover:brightness-110
                  `}
                >
                  {/* Valid move indicator */}
                  {isValidMove && !square && (
                    <div className="absolute w-4 h-4 rounded-full bg-black/20"></div>
                  )}
                  {isValidMove && square && (
                    <div className="absolute inset-0 border-4 border-black/30 rounded-sm"></div>
                  )}

                  {square && (
                    <img
                      className="w-11 h-11 piece-img relative z-10"
                      src={`/${square.color}${square.type}.png`}
                      alt={`${square.color === "b" ? "black" : "white"} ${square.type}`}
                      draggable={false}
                    />
                  )}
                </div>
              );
            })}

            {/* Right rank label */}
            <div className="w-6 h-14 flex items-center justify-center text-slate-400 text-sm font-medium bg-slate-800">
              {ranks[i]}
            </div>
          </div>
        ))}

        {/* Bottom file labels */}
        <div className="flex bg-slate-800">
          <div className="w-6"></div>
          {files.map((file) => (
            <div key={file} className="w-14 h-6 flex items-center justify-center text-slate-400 text-sm font-medium">
              {file}
            </div>
          ))}
          <div className="w-6"></div>
        </div>
      </div>

      {/* Selected square indicator */}
      {selectedSquare && (
        <div className="mt-4 px-4 py-2 glass rounded-lg">
          <span className="text-slate-300 text-sm">
            Selected: <span className="text-emerald-400 font-semibold">{selectedSquare.toUpperCase()}</span>
            {validMoves.length > 0 && (
              <span className="text-slate-400 ml-2">
                ({validMoves.length} valid move{validMoves.length !== 1 ? 's' : ''})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};
