package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 30 * time.Second
	maxMessageSize = 4096
	sendBuffer     = 32
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// The Node backend accepted connections from any site; keep that behavior.
	CheckOrigin: func(*http.Request) bool { return true },
}

// Client is one connected browser tab. gorilla/websocket allows a single
// writer per connection, so all writes go through the send channel and writePump.
type Client struct {
	conn *websocket.Conn
	send chan []byte
	done chan struct{}
	once sync.Once
}

func newClient(conn *websocket.Conn) *Client {
	return &Client{
		conn: conn,
		send: make(chan []byte, sendBuffer),
		done: make(chan struct{}),
	}
}

// Send queues a message without blocking. A client that stops reading
// until its buffer fills gets disconnected.
func (c *Client) Send(msg Outgoing) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("marshal %s: %v", msg.Type, err)
		return
	}
	select {
	case <-c.done:
	case c.send <- data:
	default:
		log.Println("send buffer full, closing client")
		c.close()
	}
}

func (c *Client) close() {
	c.once.Do(func() {
		close(c.done)
		c.conn.Close()
	})
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()
	for {
		select {
		case <-c.done:
			return
		case data := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				c.close()
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				c.close()
				return
			}
		}
	}
}

func (c *Client) readPump(m *Manager) {
	defer func() {
		log.Println("Client disconnected")
		m.RemoveUser(c)
		c.close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
				log.Printf("WebSocket error: %v", err)
			}
			return
		}
		m.HandleMessage(c, data)
	}
}

func serveWS(m *Manager, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade: %v", err)
		return
	}
	log.Println("New client connected")
	c := newClient(conn)
	m.AddUser(c)
	go c.writePump()
	c.readPump(m)
}
