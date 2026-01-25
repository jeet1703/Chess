import { useNavigate } from "react-router-dom";
import { Button } from "../Components/Button";

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">♔</span>
            <span className="text-xl font-bold text-white">Chess Arena</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-6xl w-full mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="animate-slide-up">
              <div className="inline-block mb-4">
                <span className="status-badge px-4 py-2 rounded-full text-sm font-medium">
                  ⚡ Real-time multiplayer
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
                Play Chess
                <span className="block gradient-text">Like Never Before</span>
              </h1>

              <p className="text-lg text-slate-400 mb-8 max-w-lg">
                Challenge players from around the world in real-time matches.
                Experience chess with a modern, beautiful interface designed for champions.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/game')}
                >
                  <span className="flex items-center gap-2">
                    ♟️ Play Now
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => { }}
                >
                  How to Play
                </Button>
              </div>

              {/* Stats */}
              <div className="mt-12 flex gap-8">
                <div>
                  <div className="text-3xl font-bold text-white">10K+</div>
                  <div className="text-slate-500 text-sm">Active Players</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">50K+</div>
                  <div className="text-slate-500 text-sm">Games Played</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">99%</div>
                  <div className="text-slate-500 text-sm">Uptime</div>
                </div>
              </div>
            </div>

            {/* Right Content - Chess Image */}
            <div className="flex justify-center lg:justify-end animate-fade-in">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 blur-3xl rounded-full"></div>

                {/* Chess board image */}
                <div className="relative glass rounded-2xl p-4 animate-float">
                  <img
                    className="max-w-md w-full rounded-xl shadow-2xl"
                    src="/chessboard.jpg"
                    alt="Chess board"
                  />
                </div>

                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 glass rounded-xl px-4 py-2 animate-float" style={{ animationDelay: '0.5s' }}>
                  <span className="text-white font-semibold">♔ Your Turn</span>
                </div>
                <div className="absolute -bottom-4 -left-4 glass rounded-xl px-4 py-2 animate-float" style={{ animationDelay: '1s' }}>
                  <span className="text-emerald-400 font-semibold">✓ Checkmate!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "⚡",
                title: "Real-time Play",
                desc: "Instant move synchronization with WebSocket technology"
              },
              {
                icon: "🎮",
                title: "Easy to Use",
                desc: "Intuitive interface designed for all skill levels"
              },
              {
                icon: "🏆",
                title: "Competitive",
                desc: "Track your progress and climb the leaderboard"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="card p-6 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto text-center text-slate-500 text-sm">
          © 2024 Chess Arena. Made with ♥ for chess lovers.
        </div>
      </footer>
    </div>
  );
};
