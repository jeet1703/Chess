import { useEffect, useState } from "react";

// Use wss:// for secure WebSocket connection to Render
const WS_URL = "wss://chess-backend-ltvw.onrender.com";

export const useSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        ws.onopen = () => {
            setSocket(ws);
        }

        ws.onclose = () => {
            setSocket(null);
        }

        return () => {
            ws.close();
        }
    }, [])

    return socket;
}
