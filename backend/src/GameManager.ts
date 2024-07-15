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
        console.log("User added:", socket);
        this.addHandler(socket);
    }

    removeUser(socket: WebSocket) {
        this.users = this.users.filter(user => user !== socket);
        console.log("User removed:", socket);
        // Handle game stop or cleanup if necessary
    }

    private addHandler(socket: WebSocket) {
        socket.on("message", (data) => {
            const message = JSON.parse(data.toString());
            console.log("Message received from client:", message);

            if (message.type === INIT_GAME) {
                if (this.pendingUser) {
                    const game = new Game(this.pendingUser, socket);
                    this.games.push(game);
                    console.log("Game started between:", this.pendingUser, "and", socket);
                    this.pendingUser = null;
                } else {
                    this.pendingUser = socket;
                    console.log("Pending user set:", socket);
                }
            }

            if (message.type === MOVE) {
                console.log("Move message received");
                const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                if (game) {
                    console.log("Making move in game");
                    game.makeMove(socket, message.payload.move);
                }
            }
        });

        socket.on("close", () => {
            this.removeUser(socket);
        });
    }
}
