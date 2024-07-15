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
        if (this.moveCount % 2 === 0 && socket !== this.player1) {
            console.log("Not player 1's turn");
            return;
        }
        if (this.moveCount % 2 === 1 && socket !== this.player2) {
            console.log("Not player 2's turn");
            return;
        }
        try {
            this.board.move(move);
        }
        catch (e) {
            console.log(e);
            return;
        }
        this.moveCount++;
        console.log("Move count:", this.moveCount);
        if (this.board.isGameOver()) {
            const winner = this.board.turn() === "w" ? "black" : "white";
            console.log("Game over, winner:", winner);
            this.player1.send(JSON.stringify({
                type: messages_1.GAME_OVER,
                payload: { winner }
            }));
            this.player2.send(JSON.stringify({
                type: messages_1.GAME_OVER,
                payload: { winner }
            }));
            return;
        }
        const opponent = socket === this.player1 ? this.player2 : this.player1;
        opponent.send(JSON.stringify({
            type: messages_1.MOVE,
            payload: { move }
        }));
        console.log("Move sent to opponent");
    }
}
exports.Game = Game;
