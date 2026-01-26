export function startHeartbeat(intervalMs = 60_000) {
    setInterval(() => {
        console.log(`[HEARTBEAT] Chess backend alive at ${new Date().toISOString()}`);
    }, intervalMs);
}

export function startRumPing(intervalMs = 240_000) {
    // RUM server ping to keep it alive (default: 4 minutes)
    const rumHealthUrl = 'https://rumtest.onrender.com/api/rum/health';

    const pingRum = async () => {
        try {
            const response = await fetch(rumHealthUrl);
            if (response.ok) {
                console.log(`[RUM PING] Success at ${new Date().toISOString()} - Status: ${response.status}`);
            } else {
                console.warn(`[RUM PING] Failed at ${new Date().toISOString()} - Status: ${response.status}`);
            }
        } catch (error) {
            console.error(`[RUM PING] Error at ${new Date().toISOString()}:`, error);
        }
    };

    // Initial ping on startup
    pingRum();

    // Then ping every intervalMs
    setInterval(pingRum, intervalMs);
}
