package main

import (
	"encoding/json"
	"log"
	"sync"
)

// Manager owns the matchmaking queue and every running game.
// One mutex guards all of it; Client.Send never blocks, so holding it is cheap.
type Manager struct {
	mu      sync.Mutex
	users   map[*Client]struct{}
	pending *Client
	games   map[*Client]*Game
}

func NewManager() *Manager {
	return &Manager{
		users: make(map[*Client]struct{}),
		games: make(map[*Client]*Game),
	}
}

func (m *Manager) AddUser(c *Client) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.users[c] = struct{}{}
	log.Printf("User added. Total users: %d", len(m.users))
}

func (m *Manager) RemoveUser(c *Client) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.users[c]; !ok {
		return
	}
	delete(m.users, c)
	log.Printf("User removed. Total users: %d", len(m.users))

	if m.pending == c {
		m.pending = nil
		log.Println("Pending user cleared")
	}
	m.leaveGame(c)
}

// leaveGame ends c's current game, if any, and tells the opponent when the
// game was still in progress. Caller holds m.mu.
func (m *Manager) leaveGame(c *Client) {
	g := m.games[c]
	if g == nil {
		return
	}
	if !g.over {
		g.Opponent(c).Send(opponentLeftMsg())
	}
	m.endGame(g)
}

// endGame forgets a game for both players. Caller holds m.mu.
func (m *Manager) endGame(g *Game) {
	for _, p := range []*Client{g.white, g.black} {
		if m.games[p] == g {
			delete(m.games, p)
		}
	}
	log.Printf("Game removed. Players in games: %d", len(m.games))
}

func (m *Manager) HandleMessage(c *Client, data []byte) {
	var msg Incoming
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Printf("Failed to parse message: %v", err)
		c.Send(errorMsg("Invalid message format"))
		return
	}
	log.Printf("Message received from client: %s", msg.Type)

	m.mu.Lock()
	defer m.mu.Unlock()

	switch msg.Type {
	case TypeInitGame:
		m.handleInit(c)
	case TypeMove:
		m.handleMove(c, msg.Payload)
	}
}

func (m *Manager) handleInit(c *Client) {
	// Asking for a new game while in one counts as leaving it.
	m.leaveGame(c)

	switch {
	case m.pending == c:
		log.Println("User already waiting for opponent")
		c.Send(waitingMsg())
	case m.pending != nil:
		g := NewGame(m.pending, c)
		m.games[m.pending] = g
		m.games[c] = g
		m.pending = nil
		log.Printf("Game started. Players in games: %d", len(m.games))
	default:
		m.pending = c
		log.Println("Pending user set, waiting for opponent")
		c.Send(waitingMsg())
	}
}

func (m *Manager) handleMove(c *Client, payload json.RawMessage) {
	g := m.games[c]
	if g == nil {
		c.Send(errorMsg("You are not in a game"))
		return
	}
	var p MovePayload
	if err := json.Unmarshal(payload, &p); err != nil || len(p.Move) == 0 {
		c.Send(errorMsg("Invalid message format"))
		return
	}
	if finished := g.MakeMove(c, p.Move); finished {
		m.endGame(g)
	}
}
