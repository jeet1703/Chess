// Command go-backend is the Go version of the Chess Arena WebSocket server.
// It speaks the same JSON protocol as the TypeScript server in ../backend.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
)

const defaultRumURL = "https://rumtest.onrender.com/api/rum/health"

func main() {
	port := envOr("PORT", "8080")
	manager := NewManager()

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           newMux(manager),
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go startHeartbeat(ctx, time.Minute)
	// Set RUM_PING_URL to an empty string to turn the keep-alive ping off.
	if url := envOr("RUM_PING_URL", defaultRumURL); url != "" {
		go startRumPing(ctx, url, 4*time.Minute)
	}

	go func() {
		log.Printf("WebSocket server started on ws://localhost:%s", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

// newMux serves WebSocket upgrades on any path (the frontend connects to the
// root URL) and a JSON health check on /health.
func newMux(m *Manager) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":    "ok",
			"service":   "chess-backend",
			"timestamp": time.Now().UnixMilli(),
		})
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if websocket.IsWebSocketUpgrade(r) {
			serveWS(m, w, r)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte("Chess Arena backend. Connect with a WebSocket client.\n"))
	})
	return mux
}

func envOr(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
