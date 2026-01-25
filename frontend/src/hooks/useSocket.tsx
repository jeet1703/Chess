import { useEffect, useState } from "react";

// Use environment variable for WebSocket URL
// Set VITE_WS_URL in .env (local) or .env.production (deployed)
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

export const useSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        console.log("Connecting to WebSocket:", WS_URL);
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log("WebSocket connected");
            setSocket(ws);
        }

        ws.onclose = () => {
            console.log("WebSocket disconnected");
            setSocket(null);
        }

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        }

        return () => {
            ws.close();
        }
    }, [])

    return socket;
}

