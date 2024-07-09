import { useEffect, useState } from "react";
import { ChessBoard } from "../Components/ChessBoard";
import { useSocket } from "../hooks/useSocket";
import { Chess } from "chess.js";
import { Button } from "../Components/Button";

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";

export const Game = () => {
  const socket = useSocket();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());

  useEffect(() => {
    if (!socket) {
      return;
    }
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log(message);
      switch (message.type) {
        case INIT_GAME:
          setChess(new Chess());
          setBoard(chess.board());

          console.log("Game is being initialized");
          break;
        case MOVE:
          const move = message.payload;
          chess.move(move);
          setBoard(chess.board());
          console.log("Move is being made");
          break;
        case GAME_OVER:
          console.log("Game is over");
          break;
        default:
          break;
      }
    };
  }, [socket]);

  if (!socket) {
    return <div>Connecting...</div>;
  }
  return (
    <div className="justify-center flex">
      <div className="pt-8 max-w-screen-lg w-full">
        <div className="grid grid-cols-6 gap-4 w- full">
          <div className=" col-span-4 w-full flex justify-center">
            <ChessBoard socket = {socket} board={board} />
          </div>

          <div className=" col-span-2 flex justify-center bg-slate-800">
            <div className="pt-8">
              <Button
                onClick={() => {
                  socket.send(
                    JSON.stringify({
                      type: INIT_GAME,
                    })
                  );
                }}
              >
                Play
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
