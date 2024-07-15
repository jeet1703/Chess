import { WebSocket } from "ws";
import { Chess } from 'chess.js';
import { GAME_OVER, INIT_GAME, MOVE } from "./messages";

export class Game {
    public player1: WebSocket;
    public player2: WebSocket;
    public board: Chess;
    private startTime: Date;
    private moveCount = 0;

    constructor(player1: WebSocket, player2: WebSocket) {
        this.player1 = player1;
        this.player2 = player2;
        this.board = new Chess();
        this.startTime = new Date();
        this.player1.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: "white"
            }
        }));
        this.player2.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: "black"
            }
        }));
    }

    makeMove(socket: WebSocket, move: { from: string; to: string; }) {
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
        } catch (e) {
            console.log(e);
            return;
        }

        this.moveCount++;
        console.log("Move count:", this.moveCount);

        if (this.board.isGameOver()) {
            const winner = this.board.turn() === "w" ? "black" : "white";
            console.log("Game over, winner:", winner);
            this.player1.send(JSON.stringify({
                type: GAME_OVER,
                payload: { winner }
            }));
            this.player2.send(JSON.stringify({
                type: GAME_OVER,
                payload: { winner }
            }));
            return;
        }

        const opponent = socket === this.player1 ? this.player2 : this.player1;
        opponent.send(JSON.stringify({
            type: MOVE,
            payload: { move }
        }));

        console.log("Move sent to opponent");
    }
}
