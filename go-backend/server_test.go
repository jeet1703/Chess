package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

type testClient struct {
	t    *testing.T
	conn *websocket.Conn
}

type received struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func newServer(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(newMux(NewManager()))
	t.Cleanup(srv.Close)
	return srv
}

func dial(t *testing.T, srv *httptest.Server) *testClient {
	t.Helper()
	url := "ws" + strings.TrimPrefix(srv.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	return &testClient{t: t, conn: conn}
}

func (c *testClient) send(v any) {
	c.t.Helper()
	if err := c.conn.WriteJSON(v); err != nil {
		c.t.Fatalf("write: %v", err)
	}
}

func (c *testClient) move(from, to string) {
	c.t.Helper()
	// The frontend always sends promotion "q", even for ordinary moves.
	c.send(map[string]any{"type": "move", "payload": map[string]any{"move": map[string]string{"from": from, "to": to, "promotion": "q"}}})
}

func (c *testClient) expect(msgType string) received {
	c.t.Helper()
	c.conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	var msg received
	if err := c.conn.ReadJSON(&msg); err != nil {
		c.t.Fatalf("waiting for %q: %v", msgType, err)
	}
	if msg.Type != msgType {
		c.t.Fatalf("got %q (%s), want %q", msg.Type, msg.Payload, msgType)
	}
	return msg
}

func pair(t *testing.T, srv *httptest.Server) (white, black *testClient) {
	t.Helper()
	white, black = dial(t, srv), dial(t, srv)
	white.send(map[string]string{"type": "init_game"})
	white.expect("waiting")
	black.send(map[string]string{"type": "init_game"})

	var color struct{ Color string }
	json.Unmarshal(white.expect("init_game").Payload, &color)
	if color.Color != "white" {
		t.Fatalf("first player color = %q, want white", color.Color)
	}
	json.Unmarshal(black.expect("init_game").Payload, &color)
	if color.Color != "black" {
		t.Fatalf("second player color = %q, want black", color.Color)
	}
	return white, black
}

func TestFoolsMate(t *testing.T) {
	srv := newServer(t)
	white, black := pair(t, srv)

	plays := []struct {
		mover, other *testClient
		from, to     string
	}{
		{white, black, "f2", "f3"},
		{black, white, "e7", "e5"},
		{white, black, "g2", "g4"},
	}
	for _, p := range plays {
		p.mover.move(p.from, p.to)
		p.mover.expect("move_confirmed")
		msg := p.other.expect("move")
		if !strings.Contains(string(msg.Payload), `"from":"`+p.from+`"`) {
			t.Fatalf("opponent got %s, want move from %s", msg.Payload, p.from)
		}
	}

	black.move("d8", "h4")
	black.expect("move_confirmed")
	white.expect("move") // the mating move still reaches the loser's board

	for _, c := range []*testClient{white, black} {
		var res GameResult
		json.Unmarshal(c.expect("game_over").Payload, &res)
		if res.Winner != "black" || res.Reason != "checkmate" {
			t.Fatalf("result = %+v, want black by checkmate", res)
		}
	}

	// The finished game is gone.
	white.move("e2", "e4")
	white.expect("error")
}

func TestTurnAndLegality(t *testing.T) {
	srv := newServer(t)
	white, black := pair(t, srv)

	black.move("e7", "e5")
	if msg := black.expect("error"); !strings.Contains(string(msg.Payload), "not your turn") {
		t.Fatalf("got %s, want not-your-turn error", msg.Payload)
	}

	white.move("e2", "e5")
	white.expect("invalid_move")

	white.move("e2", "e4")
	white.expect("move_confirmed")
	black.expect("move")
}

func TestPromotionDefaultsToQueen(t *testing.T) {
	g := &Game{board: newBoardFromFEN(t, "8/P7/8/8/8/8/8/k6K w - - 0 1")}
	m := findMove(g.board, MoveRequest{From: "a7", To: "a8", Promotion: "q"})
	if m == nil || m.Promo().String() != "q" {
		t.Fatalf("promotion move = %v, want a7a8q", m)
	}
	if findMove(g.board, MoveRequest{From: "h1", To: "h2", Promotion: "q"}) == nil {
		t.Fatal("king move with promotion \"q\" should still match")
	}
}

func TestDisconnectNotifiesOpponent(t *testing.T) {
	srv := newServer(t)
	white, black := pair(t, srv)
	white.conn.Close()
	black.expect("opponent_disconnected")
}

func TestNewGameMidGameEndsOldGame(t *testing.T) {
	srv := newServer(t)
	white, black := pair(t, srv)
	white.send(map[string]string{"type": "init_game"})
	black.expect("opponent_disconnected")
	white.expect("waiting")
}

func TestNotInGameAndBadJSON(t *testing.T) {
	srv := newServer(t)
	c := dial(t, srv)
	c.move("e2", "e4")
	c.expect("error")
	if err := c.conn.WriteMessage(websocket.TextMessage, []byte("{not json")); err != nil {
		t.Fatal(err)
	}
	c.expect("error")
}

func TestHealth(t *testing.T) {
	srv := newServer(t)
	resp, err := http.Get(srv.URL + "/health")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var body map[string]any
	json.NewDecoder(resp.Body).Decode(&body)
	if resp.StatusCode != 200 || body["status"] != "ok" {
		t.Fatalf("health = %d %v", resp.StatusCode, body)
	}
}
