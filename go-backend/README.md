# Chess Arena backend (Go)

A Go version of the WebSocket server in [`../backend`](../backend). It speaks the same JSON messages, so the frontend works with either server without changes.

## Run it

With Go 1.23 or newer:

```sh
cd go-backend
go run .
```

With Docker:

```sh
docker build -t chess-go-backend go-backend
docker run -p 8080:8080 chess-go-backend
```

The server listens on `ws://localhost:8080`, the same address the frontend uses by default. Point a deployed frontend at it with `VITE_WS_URL=wss://your-host`.

## Settings

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Port for WebSocket and HTTP traffic |
| `RUM_PING_URL` | `https://rumtest.onrender.com/api/rum/health` | URL pinged every 4 minutes to keep the RUM server awake. Set it to an empty string to turn the ping off. |

## Endpoints

- Any path with a WebSocket upgrade: the game connection.
- `GET /health`: returns `{"status":"ok","service":"chess-backend","timestamp":...}`.

## Messages

| From | Type | Payload |
|---|---|---|
| Client | `init_game` | none |
| Client | `move` | `{"move": {"from": "e2", "to": "e4", "promotion": "q"}}` |
| Server | `waiting` | `{"message": "..."}` |
| Server | `init_game` | `{"color": "white" \| "black"}` |
| Server | `move_confirmed` | `{"move": {...}}` sent to the player who moved |
| Server | `move` | `{"move": {...}}` sent to the opponent |
| Server | `invalid_move` | `{"message": "Invalid move", "move": {...}}` |
| Server | `game_over` | `{"winner": "white" \| "black" \| "draw", "reason": "checkmate" \| "stalemate" \| "threefold repetition" \| "insufficient material" \| "50-move rule"}` |
| Server | `opponent_disconnected` | `{"message": "..."}` |
| Server | `error` | `{"message": "..."}` |

## Differences from the Node server

Three fixes go beyond a direct port:

- Sending `init_game` during a game ends that game and tells the opponent with `opponent_disconnected`. The Node server left the opponent in a game that could never continue.
- The opponent receives the final `move` before `game_over`, so their board shows the mating move.
- Finished games are removed. In the Node server, a player who started a rematch could have their moves routed to the old, finished game.

## Tests

```sh
go test -race ./...
```

The tests start the server in-process and play games over real WebSocket connections: fool's mate, turn order, illegal moves, promotion, disconnects, and leaving mid-game.

## Code layout

| File | Contents |
|---|---|
| `main.go` | HTTP server, `/health`, shutdown on SIGINT/SIGTERM |
| `client.go` | One goroutine reading and one writing per connection, with ping/pong keepalive |
| `manager.go` | Matchmaking queue and the map from players to games |
| `game.go` | Turn checks, move validation with [notnil/chess](https://github.com/notnil/chess), game-over detection |
| `messages.go` | Message types and payloads |
| `heartbeat.go` | Heartbeat log line and the RUM keep-alive ping |
