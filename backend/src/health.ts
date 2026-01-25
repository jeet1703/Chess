import { Express } from "express";

export function registerHealthRoute(app: Express) {
    app.get("/health", (_req, res) => {
        res.status(200).json({
            status: "ok",
            service: "chess-backend",
            timestamp: Date.now()
        });
    });
}
