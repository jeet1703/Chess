package main

import "encoding/json"

// Message types. These match the TypeScript backend so the frontend works unchanged.
const (
	TypeInitGame             = "init_game"
	TypeMove                 = "move"
	TypeGameOver             = "game_over"
	TypeWaiting              = "waiting"
	TypeMoveConfirmed        = "move_confirmed"
	TypeInvalidMove          = "invalid_move"
	TypeOpponentDisconnected = "opponent_disconnected"
	TypeError                = "error"
)

// Outgoing is every message the server sends: {"type": ..., "payload": ...}.
type Outgoing struct {
	Type    string `json:"type"`
	Payload any    `json:"payload,omitempty"`
}

// Incoming is every message a client sends. Payload is decoded per type.
type Incoming struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// MovePayload is the payload of a client "move" message.
// Move stays raw so the server can echo it back exactly as the client sent it.
type MovePayload struct {
	Move json.RawMessage `json:"move"`
}

// MoveRequest is the move object itself: {"from": "e2", "to": "e4", "promotion": "q"}.
type MoveRequest struct {
	From      string `json:"from"`
	To        string `json:"to"`
	Promotion string `json:"promotion,omitempty"`
}

// GameResult is the payload of "game_over".
type GameResult struct {
	Winner string `json:"winner"` // "white", "black" or "draw"
	Reason string `json:"reason"`
}

type messagePayload struct {
	Message string `json:"message"`
}

type movePayloadOut struct {
	Message string          `json:"message,omitempty"`
	Move    json.RawMessage `json:"move"`
}

func errorMsg(text string) Outgoing {
	return Outgoing{Type: TypeError, Payload: messagePayload{Message: text}}
}

func waitingMsg() Outgoing {
	return Outgoing{Type: TypeWaiting, Payload: messagePayload{Message: "Waiting for an opponent..."}}
}

func opponentLeftMsg() Outgoing {
	return Outgoing{Type: TypeOpponentDisconnected, Payload: messagePayload{Message: "Your opponent has disconnected"}}
}
