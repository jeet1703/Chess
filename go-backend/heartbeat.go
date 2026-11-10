package main

import (
	"context"
	"log"
	"net/http"
	"time"
)

// startHeartbeat logs a line on an interval so hosting logs show the server is alive.
func startHeartbeat(ctx context.Context, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-t.C:
			log.Printf("[HEARTBEAT] Chess backend alive at %s", now.UTC().Format(time.RFC3339))
		}
	}
}

// startRumPing calls the RUM server's health URL on startup and then on an
// interval, so a free-tier host does not put it to sleep.
func startRumPing(ctx context.Context, url string, every time.Duration) {
	client := &http.Client{Timeout: 15 * time.Second}
	ping := func() {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			log.Printf("[RUM PING] bad URL %q: %v", url, err)
			return
		}
		ts := time.Now().UTC().Format(time.RFC3339)
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[RUM PING] Error at %s: %v", ts, err)
			return
		}
		resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			log.Printf("[RUM PING] Success at %s - Status: %d", ts, resp.StatusCode)
		} else {
			log.Printf("[RUM PING] Failed at %s - Status: %d", ts, resp.StatusCode)
		}
	}

	ping()
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			ping()
		}
	}
}
