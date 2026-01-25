import { useEffect, useState } from "react";
import { Button } from "../Components/Button";
import { ChessBoard } from "../Components/ChessBoard";
import { useSocket } from "../hooks/useSocket";
import { Chess } from 'chess.js';

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";

type GameStatus = 'connecting' | 'waiting' | 'playing' | 'game_over' | 'opponent_disconnected';

interface GameResult {
    winner: string;
    reason?: string;
}

export const Game = () => {
    const socket = useSocket();
    const [chess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [started, setStarted] = useState(false);
    const [gameStatus, setGameStatus] = useState<GameStatus>('connecting');
    const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
    const [gameResult, setGameResult] = useState<GameResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) {
            return;
        }

        setGameStatus('connecting');

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Message received from server:", message);

            switch (message.type) {
                case INIT_GAME:
                    setPlayerColor(message.payload.color);
                    setBoard(chess.board());
                    setStarted(true);
                    setGameStatus('playing');
                    setError(null);
                    console.log("Game initialized, playing as:", message.payload.color);
                    break;

                case 'waiting':
                    setGameStatus('waiting');
                    break;

                case MOVE:
                    const move = message.payload.move;
                    try {
                        chess.move(move);
                        setBoard(chess.board());
                        console.log("Opponent move made:", move);
                    } catch (e) {
                        console.error("Error applying opponent move:", e);
                    }
                    break;

                case 'move_confirmed':
                    // Move was validated by server
                    console.log("Move confirmed by server");
                    break;

                case 'invalid_move':
                    setError("Invalid move! Try again.");
                    // Undo the local move
                    chess.undo();
                    setBoard(chess.board());
                    setTimeout(() => setError(null), 3000);
                    break;

                case GAME_OVER:
                    console.log("Game over:", message.payload);
                    setGameStatus('game_over');
                    setGameResult(message.payload);
                    break;

                case 'opponent_disconnected':
                    setGameStatus('opponent_disconnected');
                    break;

                case 'error':
                    setError(message.payload.message);
                    setTimeout(() => setError(null), 5000);
                    break;
            }
        };

        socket.onclose = () => {
            console.log("Socket closed");
            setGameStatus('connecting');
        };

        return () => {
            socket.close();
        };
    }, [socket, chess]);

    const startNewGame = () => {
        if (socket) {
            // Reset the chess game
            chess.reset();
            setBoard(chess.board());
            setGameResult(null);
            setGameStatus('waiting');
            socket.send(JSON.stringify({ type: INIT_GAME }));
            console.log("Sent INIT_GAME message");
        }
    };

    const isMyTurn = () => {
        const turn = chess.turn();
        return (turn === 'w' && playerColor === 'white') || (turn === 'b' && playerColor === 'black');
    };

    // Loading state
    if (!socket) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center animate-fade-in">
                    <div className="spinner w-12 h-12 mx-auto mb-4"></div>
                    <p className="text-slate-400 text-lg">Connecting to server...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Chess Arena</h1>
                    {started && (
                        <p className="text-slate-400">
                            Playing as <span className={`font-semibold ${playerColor === 'white' ? 'text-slate-200' : 'text-slate-600'}`}>
                                {playerColor}
                            </span>
                        </p>
                    )}
                </header>

                {/* Error notification */}
                {error && (
                    <div className="max-w-md mx-auto mb-6 animate-slide-up">
                        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center">
                            {error}
                        </div>
                    </div>
                )}

                {/* Game Over Modal */}
                {gameStatus === 'game_over' && gameResult && (
                    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fade-in">
                        <div className="card p-8 max-w-md mx-4 text-center animate-slide-up">
                            <div className="text-6xl mb-4">
                                {gameResult.winner === 'draw' ? '🤝' :
                                    gameResult.winner === playerColor ? '🏆' : '😔'}
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">
                                {gameResult.winner === 'draw' ? 'Draw!' :
                                    gameResult.winner === playerColor ? 'You Win!' : 'You Lose!'}
                            </h2>
                            <p className="text-slate-400 mb-6">
                                {gameResult.reason === 'checkmate' ? 'Checkmate!' :
                                    gameResult.reason ? gameResult.reason.charAt(0).toUpperCase() + gameResult.reason.slice(1) : ''}
                            </p>
                            <Button onClick={startNewGame} variant="primary" size="lg">
                                Play Again
                            </Button>
                        </div>
                    </div>
                )}

                {/* Opponent Disconnected Modal */}
                {gameStatus === 'opponent_disconnected' && (
                    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fade-in">
                        <div className="card p-8 max-w-md mx-4 text-center animate-slide-up">
                            <div className="text-6xl mb-4">👋</div>
                            <h2 className="text-2xl font-bold text-white mb-2">Opponent Disconnected</h2>
                            <p className="text-slate-400 mb-6">Your opponent has left the game.</p>
                            <Button onClick={startNewGame} variant="primary" size="lg">
                                Find New Opponent
                            </Button>
                        </div>
                    </div>
                )}

                {/* Main Game Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chess Board */}
                    <div className="lg:col-span-2 flex justify-center">
                        <ChessBoard
                            chess={chess}
                            setBoard={setBoard}
                            socket={socket}
                            board={board}
                            playerColor={playerColor}
                        />
                    </div>

                    {/* Side Panel */}
                    <div className="space-y-6">
                        {/* Game Status Card */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Game Status</h3>

                            {gameStatus === 'connecting' && (
                                <div className="flex items-center gap-3 text-slate-400">
                                    <div className="spinner w-5 h-5"></div>
                                    <span>Connecting...</span>
                                </div>
                            )}

                            {gameStatus === 'waiting' && (
                                <div className="flex items-center gap-3 text-amber-400">
                                    <div className="spinner w-5 h-5 border-amber-400 border-t-amber-400"></div>
                                    <span>Waiting for opponent...</span>
                                </div>
                            )}

                            {gameStatus === 'playing' && (
                                <div className={`turn-indicator ${isMyTurn() ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {isMyTurn() ? 'Your turn' : "Opponent's turn"}
                                </div>
                            )}
                        </div>

                        {/* Play Button (when not started) */}
                        {!started && (
                            <div className="card p-6 text-center">
                                <p className="text-slate-400 mb-4">Ready to play?</p>
                                <Button
                                    onClick={startNewGame}
                                    variant="primary"
                                    size="lg"
                                    loading={gameStatus === 'waiting'}
                                    className="w-full"
                                >
                                    {gameStatus === 'waiting' ? 'Finding opponent...' : '♟️ Start Game'}
                                </Button>
                            </div>
                        )}

                        {/* Player Info */}
                        {started && (
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Players</h3>
                                <div className="space-y-3">
                                    <div className={`flex items-center gap-3 p-3 rounded-lg ${playerColor === 'white' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-700/50'
                                        }`}>
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                            <span>♔</span>
                                        </div>
                                        <span className="text-white">White {playerColor === 'white' && '(You)'}</span>
                                    </div>
                                    <div className={`flex items-center gap-3 p-3 rounded-lg ${playerColor === 'black' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-700/50'
                                        }`}>
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                                            <span>♚</span>
                                        </div>
                                        <span className="text-white">Black {playerColor === 'black' && '(You)'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Controls */}
                        {started && gameStatus === 'playing' && (
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Controls</h3>
                                <Button
                                    onClick={startNewGame}
                                    variant="ghost"
                                    size="md"
                                    className="w-full"
                                >
                                    New Game
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
