"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const chess_js_1 = require("chess.js");
const messages_1 = require("./messages");
class Game {
    constructor(player1, player2) {
        this.moveCount = 0;
        this.player1 = player1;
        this.player2 = player2;
        this.board = new chess_js_1.Chess();
        this.startTime = new Date();
        this.player1.send(JSON.stringify({
            type: messages_1.INIT_GAME,
            payload: {
                color: "white"
            }
        }));
        this.player2.send(JSON.stringify({
            type: messages_1.INIT_GAME,
            payload: {
                color: "black"
            }
        }));
    }
    makeMove(socket, move) {
        console.log("Received move:", move);
        // Check if it's the correct player's turn
        if (this.moveCount % 2 === 0 && socket !== this.player1) {
            console.log("Not player 1's turn");
            socket.send(JSON.stringify({
                type: "error",
                payload: { message: "It's not your turn" }
            }));
            return;
        }
        if (this.moveCount % 2 === 1 && socket !== this.player2) {
            console.log("Not player 2's turn");
            socket.send(JSON.stringify({
                type: "error",
                payload: { message: "It's not your turn" }
            }));
            return;
        }
        try {
            this.board.move(move);
        }
        catch (e) {
            console.log("Invalid move:", e);
            socket.send(JSON.stringify({
                type: "invalid_move",
                payload: { message: "Invalid move", move }
            }));
            return;
        }
        this.moveCount++;
        console.log("Move count:", this.moveCount);
        // Send move confirmation to the player who made the move
        socket.send(JSON.stringify({
            type: "move_confirmed",
            payload: { move }
        }));
        // Check for game over
        if (this.board.isGameOver()) {
            let result = {
                winner: this.board.turn() === "w" ? "black" : "white",
                reason: "checkmate"
            };
            if (this.board.isStalemate()) {
                result = { winner: "draw", reason: "stalemate" };
            }
            else if (this.board.isThreefoldRepetition()) {
                result = { winner: "draw", reason: "threefold repetition" };
            }
            else if (this.board.isInsufficientMaterial()) {
                result = { winner: "draw", reason: "insufficient material" };
            }
            else if (this.board.isDraw()) {
                result = { winner: "draw", reason: "50-move rule" };
            }
            console.log("Game over:", result);
            this.player1.send(JSON.stringify({
                type: messages_1.GAME_OVER,
                payload: result
            }));
            this.player2.send(JSON.stringify({
                type: messages_1.GAME_OVER,
                payload: result
            }));
            return;
        }
        // Send move to opponent
        const opponent = socket === this.player1 ? this.player2 : this.player1;
        opponent.send(JSON.stringify({
            type: messages_1.MOVE,
            payload: { move }
        }));
        console.log("Move sent to opponent");
    }
}
exports.Game = Game;
