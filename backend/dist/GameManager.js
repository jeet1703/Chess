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
        console.log("User added. Total users:", this.users.length);
        this.addHandler(socket);
    }
    removeUser(socket) {
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
            }
            catch (e) {
                console.error("Error notifying opponent:", e);
            }
            this.games = this.games.filter(g => g !== game);
            console.log("Game removed. Total games:", this.games.length);
        }
    }
    addHandler(socket) {
        socket.on("message", (data) => {
            let message;
            try {
                message = JSON.parse(data.toString());
            }
            catch (e) {
                console.error("Failed to parse message:", e);
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Invalid message format" }
                }));
                return;
            }
            console.log("Message received from client:", message.type);
            if (message.type === messages_1.INIT_GAME) {
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
                    const game = new Game_1.Game(this.pendingUser, socket);
                    this.games.push(game);
                    console.log("Game started. Total games:", this.games.length);
                    this.pendingUser = null;
                }
                else {
                    this.pendingUser = socket;
                    console.log("Pending user set, waiting for opponent");
                    socket.send(JSON.stringify({
                        type: "waiting",
                        payload: { message: "Waiting for an opponent..." }
                    }));
                }
            }
            if (message.type === messages_1.MOVE) {
                const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                if (game) {
                    game.makeMove(socket, message.payload.move);
                }
                else {
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
exports.GameManager = GameManager;
