import { useEffect, useState } from "react";
import { Button } from "../Components/Button";
import { ChessBoard } from "../Components/ChessBoard";
import { useSocket } from "../hooks/useSocket";
import { Chess } from 'chess.js';

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";

export const Game = () => {
    const socket = useSocket();
    const [chess, setChess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [started, setStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    useEffect(() => {
        if (!socket) {
            return;
        }
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Message received from server:", message);

            switch (message.type) {
                case INIT_GAME:
                    setBoard(chess.board());
                    setStarted(true);
                    console.log("Game initialized");
                    break;
                case MOVE:
                    const move = message.payload.move;
                    chess.move(move);
                    setBoard(chess.board());
                    console.log("Move made:", move);
                    break;
                case GAME_OVER:
                    console.log("Game over");
                    setGameOver(true);
                    break;
            }
        };

        socket.onclose = () => {
            console.log("Socket closed");
        };

        return () => {
            socket.close();
        };
    }, [socket]);

    if (!socket) return <div>Connecting...</div>;

    return (
        <div className="justify-center flex">
            <div className="pt-8 max-w-screen-lg w-full">
                <div className="grid grid-cols-6 gap-4 w-full">
                  {gameOver&& <div className="col-span-6 flex justify-center">
                        <h1 className="text-4xl font-bold text-white">
                            Game over
                            </h1>
                          </div>}
                    <div className="col-span-4 w-full flex justify-center">
                        <ChessBoard chess={chess} setBoard={setBoard} socket={socket} board={board} />
                    </div>
                    <div className="col-span-2 bg-slate-900 w-full flex justify-center">
                        <div className="pt-8">
                            {!started && <Button onClick={() => {
                                socket.send(JSON.stringify({
                                    type: INIT_GAME
                                }));
                                console.log("Sent INIT_GAME message");
                            }} >
                                Play
                            </Button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
