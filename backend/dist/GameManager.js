"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const messages_1 = require("./messages");
const Game_1 = require("./Game");
class GameManager {
    constructor() {
        this.games = [];
        this.pendingUser = null;
        this.users = [];
    }
    addUser(socket) {
        this.users.push(socket);
        console.log("User added:", socket);
        this.addHandler(socket);
    }
    removeUser(socket) {
        this.users = this.users.filter(user => user !== socket);
        console.log("User removed:", socket);
        // Handle game stop or cleanup if necessary
    }
    addHandler(socket) {
        socket.on("message", (data) => {
            const message = JSON.parse(data.toString());
            console.log("Message received from client:", message);
            if (message.type === messages_1.INIT_GAME) {
                if (this.pendingUser) {
                    const game = new Game_1.Game(this.pendingUser, socket);
                    this.games.push(game);
                    console.log("Game started between:", this.pendingUser, "and", socket);
                    this.pendingUser = null;
                }
                else {
                    this.pendingUser = socket;
                    console.log("Pending user set:", socket);
                }
            }
            if (message.type === messages_1.MOVE) {
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
exports.GameManager = GameManager;
