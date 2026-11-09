import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../Components/Button";
import { Hero3D, Hero3DHandle, Hero3DStatus } from "../Components/Hero3D";

const steps = [
  {
    title: "Get paired",
    desc: "Press Play and you join the queue. The next person who joins plays the other color."
  },
  {
    title: "Make your moves",
    desc: "Click a piece to see its legal squares, then click where it goes. Pawns promote to a queen."
  },
  {
    title: "Finish the game",
    desc: "Checkmate, stalemate, or a draw rule ends it. Start another game from the result screen."
  }
];

const Reveal = ({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ '--d': `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
};

const d = (ms: number) => ({ '--d': `${ms}ms` } as CSSProperties);

export const Landing = () => {
  const navigate = useNavigate();
  const play = () => navigate('/game');
  const boardCtl = useRef<Hero3DHandle | null>(null);
  const [status, setStatus] = useState<Hero3DStatus>({ mode: 'demo', text: 'Italian Game' });

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-stone-900 text-white text-xl transition-transform duration-300 group-hover:-rotate-6">♞</span>
            <span className="font-display text-xl font-semibold tracking-tight">Chess Arena</span>
          </Link>
          <Button onClick={play} size="sm">Play</Button>
        </div>
      </nav>

      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 hero-glow" />
        <div className="absolute inset-0 hero-grid" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14 grid gap-12 lg:gap-16 lg:grid-cols-[1.15fr_1fr] items-center">
          <div className="rise order-2 lg:order-1 relative" style={d(150)}>
            <Hero3D
              onStatus={setStatus}
              controlRef={boardCtl}
              className="w-full h-[380px] sm:h-[480px] lg:h-[min(620px,calc(100vh-140px))]"
            />
            <div className="absolute inset-x-0 bottom-2 flex flex-wrap items-center justify-center gap-2 pointer-events-none">
              <span key={status.text} className="fade-in pointer-events-auto bg-white/85 backdrop-blur ring-1 ring-stone-200 shadow-sm rounded-full px-4 py-1.5 text-sm font-medium text-stone-700">
                {status.mode === 'demo' ? <><span className="text-stone-400 mr-2">Demo</span><span className="font-mono">{status.text}</span></> : status.text}
              </span>
              {status.mode === 'demo' ? (
                <span className="fade-in bg-stone-900 text-white rounded-full px-4 py-1.5 text-sm font-medium">Click a piece to take over</span>
              ) : (
                <span className="fade-in pointer-events-auto flex gap-2">
                  <button onClick={() => boardCtl.current?.reset()} className="bg-white/85 backdrop-blur ring-1 ring-stone-200 hover:ring-stone-300 rounded-full px-4 py-1.5 text-sm font-medium transition">Reset</button>
                  <button onClick={() => boardCtl.current?.demo()} className="bg-white/85 backdrop-blur ring-1 ring-stone-200 hover:ring-stone-300 rounded-full px-4 py-1.5 text-sm font-medium transition">Watch demo</button>
                </span>
              )}
            </div>
          </div>

          <div className="order-1 lg:order-2 text-center lg:text-left">
            <p className="rise inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] bg-[rgba(47,125,79,0.1)] px-3 py-1 rounded-full mb-6" style={d(0)}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] turn-dot" />
              Live multiplayer
            </p>
            <h1 className="rise font-display text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-6" style={d(60)}>
              Play chess against another person, live.
            </h1>
            <p className="rise text-lg text-stone-500 max-w-md mx-auto lg:mx-0 mb-10" style={d(120)}>
              No account needed. Open a game, get paired, and both boards
              update the moment either of you moves.
            </p>
            <div className="rise flex flex-col items-center lg:items-start gap-3" style={d(180)}>
              <Button onClick={play} size="lg" className="w-full sm:w-80 py-5 text-xl">
                <span className="text-2xl leading-none">♟</span>
                Play online
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Button>
              <span className="text-sm text-stone-400">Free. Opens in this tab.</span>
            </div>
          </div>
        </div>
      </main>

      <section className="py-20 px-4 sm:px-6 bg-white border-t border-stone-200/80">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-10">How a game works</h2>
          </Reveal>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((step, idx) => (
              <li key={step.title}>
                <Reveal delay={idx * 100} className="h-full">
                  <div className="h-full rounded-2xl ring-1 ring-stone-200 bg-[var(--bg)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-stone-300">
                    <div className="w-9 h-9 rounded-lg bg-[var(--accent)] text-white grid place-items-center font-semibold mb-5">{idx + 1}</div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-stone-500">{step.desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <Reveal delay={150} className="mt-12 flex justify-center">
            <Button onClick={play} variant="dark" size="lg">
              Start a game
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Button>
          </Reveal>
        </div>
      </section>

      <footer className="py-6 px-6 border-t border-stone-200/80 bg-white">
        <div className="max-w-6xl mx-auto text-center text-stone-400 text-sm">
          © {new Date().getFullYear()} Chess Arena
        </div>
      </footer>
    </div>
  );
};
