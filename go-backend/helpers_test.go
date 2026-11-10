package main

import (
	"testing"

	"github.com/notnil/chess"
)

func newBoardFromFEN(t *testing.T, fen string) *chess.Game {
	t.Helper()
	opt, err := chess.FEN(fen)
	if err != nil {
		t.Fatalf("FEN %q: %v", fen, err)
	}
	return chess.NewGame(opt)
}
