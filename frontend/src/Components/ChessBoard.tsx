import { Color, PieceSymbol, Square } from "chess.js";
import { useState } from "react";
import { MOVE } from "../screens/Game";

export const ChessBoard = ({
  board,
  socket,
}: {
  board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][];
  socket: WebSocket;
}) => {
  const [from, setFrom] = useState<null | Square>(null);
  const [to, setTo] = useState<null | Square>(null);
  console.log(to);

  return (
    <div className="text-white">
      {board.map((row, index) => {
        let i=index;
        return (
          <div key={i} className="flex">
            {row.map((square, j) => {
              const squareRepresentation = (String.fromCharCode(97 + (j%8)) +
              '' +
              (8-i)) as Square;
              
              return (
                <div
                  onClick={() => {
                    console.log(squareRepresentation);
                    if (!from) {
                      setFrom(squareRepresentation);
                      
                    } else {
                      setTo(squareRepresentation);
                      setFrom(null);
                      socket.send(
                        JSON.stringify({
                          type: MOVE,
                          payload: {
                            from: from.toString(),
                            to: squareRepresentation,
                          },
                        })
                      );
                      console.log({
                        from: from.toString(),
                        to: squareRepresentation,
                      });
                    }
                  }}
                  key={j}
                  className={`w-16 h-16 ${
                    (i + j) % 2 === 0 ? "bg-green-500" : "bg-green-50"
                  }`}
                >
                  <div className="w-full justify-center flex">
                    <div className="h-full justify-center flex flex-col text-black">
                      {square ? square.type : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
