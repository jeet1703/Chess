import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Chess, Color, PieceSymbol } from 'chess.js';
import { Button } from "../Components/Button";
import { BoardMove, ChessBoard } from "../Components/ChessBoard";
import { useSocket } from "../hooks/useSocket";

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";

type GameStatus = 'idle' | 'waiting' | 'playing' | 'game_over' | 'opponent_disconnected' | 'offline';
type Side = 'white' | 'black';

interface GameResult {
    winner: string;
    reason?: string;
}

const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_ORDER: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];

const Logo = () => (
    <Link to="/" className="flex items-center gap-2.5 group">
        <span className="grid place-items-center w-9 h-9 rounded-lg bg-stone-900 text-white text-xl transition-transform duration-300 group-hover:-rotate-6">♞</span>
        <span className="font-display text-xl font-semibold tracking-tight">Chess Arena</span>
    </Link>
);

interface PlayerBarProps {
    name: string;
    side: Side;
    active: boolean;
    captured: PieceSymbol[];
    advantage: number;
    placeholder?: boolean;
}

const PlayerBar = ({ name, side, active, captured, advantage, placeholder }: PlayerBarProps) => {
    const capturedColor = side === 'white' ? 'b' : 'w';
    return (
        <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${active ? 'bg-white shadow-sm ring-1 ring-stone-200' : ''}`}>
            <div className={`w-10 h-10 rounded-lg grid place-items-center ring-1 ${side === 'white' ? 'bg-white ring-stone-200' : 'bg-stone-800 ring-stone-800'}`}>
                <img src={`/${side === 'white' ? 'w' : 'b'}k.png`} alt="" className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
                <div className={`font-semibold text-sm ${placeholder ? 'text-stone-400' : 'text-stone-900'}`}>{name}</div>
                <div className="flex items-center h-5">
                    {captured.map((type, i) => (
                        <img key={i} src={`/${capturedColor}${type}.png`} alt="" className="w-4 h-4 -ml-1 first:ml-0 opacity-80 fade-in" />
                    ))}
                    {advantage > 0 && <span className="ml-1.5 text-xs font-semibold text-stone-500">+{advantage}</span>}
                </div>
            </div>
            <div className={`flex items-center gap-2 text-xs font-semibold transition-opacity duration-300 ${active ? 'opacity-100 text-[var(--accent)]' : 'opacity-0'}`}>
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] turn-dot" />
                To move
            </div>
        </div>
    );
};

export const Game = () => {
    const socket = useSocket();
    const [chess] = useState(() => new Chess());
    const [board, setBoard] = useState(chess.board());
    const [started, setStarted] = useState(false);
    const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
    const [playerColor, setPlayerColor] = useState<Side>('white');
    const [gameResult, setGameResult] = useState<GameResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const moveListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        setGameStatus('idle');

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case INIT_GAME:
                    chess.reset();
                    setPlayerColor(message.payload.color);
                    setBoard(chess.board());
                    setStarted(true);
                    setGameStatus('playing');
                    setError(null);
                    break;

                case 'waiting':
                    setGameStatus('waiting');
                    break;

                case MOVE:
                    try {
                        chess.move(message.payload.move);
                        setBoard(chess.board());
                    } catch (e) {
                        console.error("Error applying opponent move:", e);
                    }
                    break;

                case 'invalid_move':
                    setError("The server rejected that move. Try another.");
                    chess.undo();
                    setBoard(chess.board());
                    setTimeout(() => setError(null), 3000);
                    break;

                case GAME_OVER:
                    setGameStatus('game_over');
                    setGameResult(message.payload);
                    break;

                case 'opponent_disconnected':
                    setGameStatus('opponent_disconnected');
                    break;

                case 'error':
                    setError(message.payload.message);
                    setTimeout(() => setError(null), 4000);
                    break;
            }
        };

        socket.onclose = () => setGameStatus('offline');

        return () => {
            socket.close();
        };
    }, [socket, chess]);

    const history = chess.history({ verbose: true });

    useEffect(() => {
        const el = moveListRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [history.length]);

    const startNewGame = () => {
        if (!socket) return;
        chess.reset();
        setBoard(chess.board());
        setGameResult(null);
        setGameStatus('waiting');
        socket.send(JSON.stringify({ type: INIT_GAME }));
    };

    const handleMove = (move: BoardMove) => {
        socket?.send(JSON.stringify({ type: MOVE, payload: { move } }));
        setBoard(chess.board());
    };

    const playing = gameStatus === 'playing';
    const opponentColor: Side = playerColor === 'white' ? 'black' : 'white';
    const turnSide: Side = chess.turn() === 'w' ? 'white' : 'black';
    const myTurn = playing && turnSide === playerColor;

    // Pieces each side has taken, sorted by value, plus material lead.
    const capturedBy = (color: Color) =>
        history
            .filter((m) => m.color === color && m.captured)
            .map((m) => m.captured as PieceSymbol)
            .sort((a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b));
    const myCaptures = capturedBy(playerColor === 'white' ? 'w' : 'b');
    const theirCaptures = capturedBy(opponentColor === 'white' ? 'w' : 'b');
    const material = (list: PieceSymbol[]) => list.reduce((sum, p) => sum + PIECE_VALUE[p], 0);
    const lead = material(myCaptures) - material(theirCaptures);

    const movePairs: [string, string | undefined][] = [];
    for (let i = 0; i < history.length; i += 2) {
        movePairs.push([history[i].san, history[i + 1]?.san]);
    }

    if (!socket) {
        return (
            <div className="min-h-screen grid place-items-center">
                <div className="text-center fade-in">
                    <div className="spinner w-8 h-8 mx-auto mb-4 text-[var(--accent)]" />
                    <p className="text-stone-500">Connecting to the server</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <nav className="border-b border-stone-200/80 bg-white/70 backdrop-blur sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Logo />
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                        <span className={`w-2 h-2 rounded-full ${gameStatus === 'offline' ? 'bg-red-500' : 'bg-[var(--accent)]'}`} />
                        {gameStatus === 'offline' ? 'Offline' : 'Connected'}
                    </div>
                </div>
            </nav>

            {error && (
                <div className="fixed top-20 left-1/2 z-50 toast-in">
                    <div className="bg-stone-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl">{error}</div>
                </div>
            )}

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10 grid gap-6 lg:gap-8 lg:grid-cols-[auto_minmax(300px,360px)] justify-center items-start">
                <section className="flex flex-col gap-2 rise">
                    <PlayerBar
                        name={started ? 'Opponent' : 'Waiting for opponent'}
                        side={opponentColor}
                        active={playing && !myTurn}
                        captured={theirCaptures}
                        advantage={-lead}
                        placeholder={!started}
                    />
                    <ChessBoard
                        chess={chess}
                        board={board}
                        playerColor={playerColor}
                        interactive={playing}
                        onMove={handleMove}
                        className="w-[min(92vw,600px)] lg:w-[min(calc(100vh-240px),600px)] min-w-[280px]"
                    />
                    <PlayerBar
                        name="You"
                        side={playerColor}
                        active={myTurn}
                        captured={myCaptures}
                        advantage={lead}
                    />
                </section>

                <aside className="rise flex flex-col gap-4 lg:sticky lg:top-24" style={{ '--d': '120ms' } as CSSProperties}>
                    <div className="bg-white rounded-2xl ring-1 ring-stone-200 shadow-sm p-6">
                        {gameStatus === 'idle' && (
                            <div key="idle" className="fade-in">
                                <h2 className="font-display text-2xl font-semibold mb-1">Play online</h2>
                                <p className="text-stone-500 text-sm mb-5">You'll play the next person who joins the queue.</p>
                                <Button onClick={startNewGame} size="lg" className="w-full">Find a game</Button>
                            </div>
                        )}

                        {gameStatus === 'waiting' && (
                            <div key="waiting" className="fade-in text-center py-2">
                                <div className="relative w-16 h-16 mx-auto mb-5">
                                    <span className="search-ring" />
                                    <span className="search-ring" />
                                    <span className="search-ring" />
                                    <span className="absolute inset-0 grid place-items-center rounded-full bg-[var(--accent)] text-white text-2xl">♞</span>
                                </div>
                                <h2 className="font-semibold text-lg">Looking for an opponent</h2>
                                <p className="text-stone-500 text-sm mt-1">Testing alone? Open this page in a second tab.</p>
                            </div>
                        )}

                        {playing && (
                            <div key="playing" className="fade-in">
                                <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                                    Move {Math.floor(history.length / 2) + 1}
                                </div>
                                <h2 key={String(myTurn)} className="font-display text-2xl font-semibold fade-in">
                                    {myTurn ? 'Your move' : "Opponent's move"}
                                </h2>
                                {chess.inCheck() && (
                                    <p className="mt-2 inline-block text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md fade-in">
                                        {myTurn ? 'You are in check' : 'Opponent is in check'}
                                    </p>
                                )}
                            </div>
                        )}

                        {(gameStatus === 'game_over' || gameStatus === 'opponent_disconnected') && (
                            <div key="over" className="fade-in">
                                <h2 className="font-display text-2xl font-semibold mb-4">Game over</h2>
                                <Button onClick={startNewGame} size="lg" className="w-full">New game</Button>
                            </div>
                        )}

                        {gameStatus === 'offline' && (
                            <div key="offline" className="fade-in">
                                <h2 className="font-display text-2xl font-semibold mb-1">Connection lost</h2>
                                <p className="text-stone-500 text-sm mb-5">The server closed the connection.</p>
                                <Button onClick={() => window.location.reload()} variant="dark" className="w-full">Reconnect</Button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl ring-1 ring-stone-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-stone-100 text-sm font-semibold">Moves</div>
                        <div ref={moveListRef} className="h-64 lg:h-72 overflow-y-auto scroll-thin text-sm">
                            {movePairs.length === 0 ? (
                                <p className="text-stone-400 px-5 py-4">No moves yet.</p>
                            ) : (
                                <ol>
                                    {movePairs.map(([white, black], i) => (
                                        <li key={i} className={`grid grid-cols-[3rem_1fr_1fr] px-5 py-1.5 ${i % 2 ? 'bg-stone-50' : ''}`}>
                                            <span className="text-stone-400">{i + 1}.</span>
                                            <span className={`move-in font-medium ${i * 2 === history.length - 1 ? 'text-[var(--accent)]' : ''}`}>{white}</span>
                                            {black && <span className={`move-in font-medium ${i * 2 + 1 === history.length - 1 ? 'text-[var(--accent)]' : ''}`}>{black}</span>}
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </div>

                    {playing && (
                        <Button onClick={startNewGame} variant="ghost" className="self-center">
                            Leave and start a new game
                        </Button>
                    )}
                </aside>
            </main>

            {gameStatus === 'game_over' && gameResult && (
                <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-stone-900/30 backdrop-blur-sm backdrop-in">
                    <div className="modal-in bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
                        <div className="flex justify-center gap-1 mb-4">
                            {gameResult.winner === 'draw' ? (
                                <>
                                    <img src="/wk.png" alt="" className="w-16 h-16" />
                                    <img src="/bk.png" alt="" className="w-16 h-16" />
                                </>
                            ) : (
                                <img src={`/${gameResult.winner === 'white' ? 'w' : 'b'}k.png`} alt="" className="w-20 h-20" />
                            )}
                        </div>
                        <h2 className="font-display text-4xl font-semibold mb-1">
                            {gameResult.winner === 'draw' ? 'Draw' :
                                gameResult.winner === playerColor ? 'You won' : 'You lost'}
                        </h2>
                        {gameResult.reason && <p className="text-stone-500 mb-6">By {gameResult.reason}</p>}
                        <Button onClick={startNewGame} size="lg" className="w-full">Play again</Button>
                        <Link to="/" className="inline-block mt-4 text-sm text-stone-500 hover:text-stone-900 transition-colors">Back to home</Link>
                    </div>
                </div>
            )}

            {gameStatus === 'opponent_disconnected' && (
                <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-stone-900/30 backdrop-blur-sm backdrop-in">
                    <div className="modal-in bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
                        <h2 className="font-display text-3xl font-semibold mb-2">Your opponent left</h2>
                        <p className="text-stone-500 mb-6">They closed the connection, so this game is over.</p>
                        <Button onClick={startNewGame} size="lg" className="w-full">Find another opponent</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
