import { WebSocketServer } from 'ws';
import { GameManager } from './GameManager';
import { startHeartbeat, startRumPing } from './heartbeat';

const wss = new WebSocketServer({ port: 8080 });
const gameManager = new GameManager();

wss.on('connection', function connection(ws) {
    console.log("New client connected");
    gameManager.addUser(ws);

    ws.on("close", () => {
        console.log("Client disconnected");
        gameManager.removeUser(ws);
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
    });
});

console.log("WebSocket server started on ws://localhost:8080");

// Log heartbeat every 1 minute for observability
startHeartbeat(60_000);

// Ping RUM server every 4 minutes to keep it alive
startRumPing(240_000);

