package main

import (
	"encoding/json"
	"log"
	"strings"

	"github.com/notnil/chess"
)

// Game is one match between two clients. White moves first.
type Game struct {
	white *Client
	black *Client
	board *chess.Game
	over  bool
}

// NewGame pairs two clients and tells each which color they play.
func NewGame(white, black *Client) *Game {
	g := &Game{white: white, black: black, board: chess.NewGame()}
	white.Send(Outgoing{Type: TypeInitGame, Payload: map[string]string{"color": "white"}})
	black.Send(Outgoing{Type: TypeInitGame, Payload: map[string]string{"color": "black"}})
	return g
}

func (g *Game) Opponent(c *Client) *Client {
	if c == g.white {
		return g.black
	}
	return g.white
}

func (g *Game) colorOf(c *Client) chess.Color {
	if c == g.white {
		return chess.White
	}
	return chess.Black
}

// MakeMove validates and plays a move from c. It returns true when the move ends the game.
func (g *Game) MakeMove(c *Client, raw json.RawMessage) bool {
	if g.over {
		c.Send(errorMsg("This game is over"))
		return false
	}
	if g.colorOf(c) != g.board.Position().Turn() {
		c.Send(errorMsg("It's not your turn"))
		return false
	}

	var req MoveRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		c.Send(Outgoing{Type: TypeInvalidMove, Payload: movePayloadOut{Message: "Invalid move", Move: raw}})
		return false
	}
	move := findMove(g.board, req)
	if move == nil {
		log.Printf("Invalid move: %+v", req)
		c.Send(Outgoing{Type: TypeInvalidMove, Payload: movePayloadOut{Message: "Invalid move", Move: raw}})
		return false
	}
	if err := g.board.Move(move); err != nil {
		c.Send(Outgoing{Type: TypeInvalidMove, Payload: movePayloadOut{Message: "Invalid move", Move: raw}})
		return false
	}

	c.Send(Outgoing{Type: TypeMoveConfirmed, Payload: movePayloadOut{Move: raw}})
	// The opponent always gets the move, including the one that ends the game,
	// so their board shows the final position.
	g.Opponent(c).Send(Outgoing{Type: TypeMove, Payload: movePayloadOut{Move: raw}})

	if result := g.result(); result != nil {
		g.over = true
		log.Printf("Game over: %+v", *result)
		msg := Outgoing{Type: TypeGameOver, Payload: result}
		g.white.Send(msg)
		g.black.Send(msg)
		return true
	}
	return false
}

// findMove matches a {from, to, promotion} request against the legal moves.
// The frontend sends promotion "q" on every move, so promotion only counts
// when the move is a pawn promotion.
func findMove(board *chess.Game, req MoveRequest) *chess.Move {
	want := chess.Queen
	switch strings.ToLower(req.Promotion) {
	case "r":
		want = chess.Rook
	case "b":
		want = chess.Bishop
	case "n":
		want = chess.Knight
	}
	for _, m := range board.ValidMoves() {
		if m.S1().String() != req.From || m.S2().String() != req.To {
			continue
		}
		if m.Promo() == chess.NoPieceType || m.Promo() == want {
			return m
		}
	}
	return nil
}

// result reports how the game ended, or nil while it is still going.
// chess.js ends the game on threefold repetition and the 50-move rule without
// a claim, so the server claims those draws here to match.
func (g *Game) result() *GameResult {
	for _, method := range g.board.EligibleDraws() {
		if method == chess.ThreefoldRepetition || method == chess.FiftyMoveRule {
			_ = g.board.Draw(method)
			break
		}
	}

	var winner string
	switch g.board.Outcome() {
	case chess.NoOutcome:
		return nil
	case chess.WhiteWon:
		winner = "white"
	case chess.BlackWon:
		winner = "black"
	default:
		winner = "draw"
	}

	reason := "draw"
	switch g.board.Method() {
	case chess.Checkmate:
		reason = "checkmate"
	case chess.Stalemate:
		reason = "stalemate"
	case chess.ThreefoldRepetition, chess.FivefoldRepetition:
		reason = "threefold repetition"
	case chess.InsufficientMaterial:
		reason = "insufficient material"
	case chess.FiftyMoveRule, chess.SeventyFiveMoveRule:
		reason = "50-move rule"
	}
	return &GameResult{Winner: winner, Reason: reason}
}
