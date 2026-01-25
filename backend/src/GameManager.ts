import { WebSocket } from "ws";
import { INIT_GAME, MOVE } from "./messages";
import { Game } from "./Game";

export class GameManager {
    private games: Game[];
    private pendingUser: WebSocket | null;
    private users: WebSocket[];

    constructor() {
        this.games = [];
        this.pendingUser = null;
        this.users = [];
    }

    addUser(socket: WebSocket) {
        this.users.push(socket);
        console.log("User added. Total users:", this.users.length);
        this.addHandler(socket);
    }

    removeUser(socket: WebSocket) {
        this.users = this.users.filter(user => user !== socket);
        console.log("User removed. Total users:", this.users.length);

        // Clear pending user if they disconnect
        if (this.pendingUser === socket) {
            this.pendingUser = null;
            console.log("Pending user cleared");
        }

        // Handle game cleanup - notify opponent and remove game
        const game = this.games.find(g => g.player1 === socket || g.player2 === socket);
        if (game) {
            const opponent = game.player1 === socket ? game.player2 : game.player1;
            try {
                opponent.send(JSON.stringify({
                    type: "opponent_disconnected",
                    payload: { message: "Your opponent has disconnected" }
                }));
            } catch (e) {
                console.error("Error notifying opponent:", e);
            }
            this.games = this.games.filter(g => g !== game);
            console.log("Game removed. Total games:", this.games.length);
        }
    }

    private addHandler(socket: WebSocket) {
        socket.on("message", (data) => {
            let message;
            try {
                message = JSON.parse(data.toString());
            } catch (e) {
                console.error("Failed to parse message:", e);
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Invalid message format" }
                }));
                return;
            }

            console.log("Message received from client:", message.type);

            if (message.type === INIT_GAME) {
                if (this.pendingUser) {
                    // Don't match a user with themselves
                    if (this.pendingUser === socket) {
                        console.log("User already waiting for opponent");
                        socket.send(JSON.stringify({
                            type: "waiting",
                            payload: { message: "Waiting for an opponent..." }
                        }));
                        return;
                    }
                    const game = new Game(this.pendingUser, socket);
                    this.games.push(game);
                    console.log("Game started. Total games:", this.games.length);
                    this.pendingUser = null;
                } else {
                    this.pendingUser = socket;
                    console.log("Pending user set, waiting for opponent");
                    socket.send(JSON.stringify({
                        type: "waiting",
                        payload: { message: "Waiting for an opponent..." }
                    }));
                }
            }

            if (message.type === MOVE) {
                const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                if (game) {
                    game.makeMove(socket, message.payload.move);
                } else {
                    socket.send(JSON.stringify({
                        type: "error",
                        payload: { message: "You are not in a game" }
                    }));
                }
            }
        });

        socket.on("close", () => {
            this.removeUser(socket);
        });
    }
}

