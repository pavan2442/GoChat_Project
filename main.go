package main

import (
	"log"
	"net/http"
	"time"
	"database/sql"
	
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	"github.com/gorilla/websocket"
	_ "modernc.org/sqlite"

)


var clients = make(map[*websocket.Conn]bool)
var broadcast = make(chan Message)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}


// -------- WEBSOCKET CONNECTION --------
func handleConnections(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}

	clients[ws] = true

	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			delete(clients, ws)
			ws.Close()
			break
		}
		db.Exec(
	"INSERT INTO messages(roomId, username, text, time) VALUES (?, ?, ?, ?)",
	msg.RoomID, msg.Username, msg.Text, msg.Time,
)


		messages = append(messages, msg)
		msg.Time = time.Now().Format("15:04")
broadcast <- msg

	}
}


// -------- BROADCAST MESSAGES --------
func handleMessages() {
	for {
		msg := <-broadcast

		for client := range clients {
			client.WriteJSON(msg)
		}
	}
}

var db *sql.DB


// -------- MAIN --------
func main() {
	var err error

db, err = sql.Open("sqlite", "./chat.db")

if err != nil {
	panic(err)
}

createTable := `
CREATE TABLE IF NOT EXISTS messages (
	roomId TEXT,
	username TEXT,
	text TEXT,
	time TEXT
);
`

db.Exec(createTable)

	r := gin.Default()
	r.Use(cors.Default())


	// REST routes
	r.GET("/rooms", listRooms)
	r.POST("/rooms", createRoom)
	r.GET("/rooms/:id/messages", getMessages)
	r.POST("/rooms/:id/messages", postMessage)
	r.POST("/login", loginUser)


	// websocket
	r.GET("/ws", handleConnections)

	go handleMessages()

	r.Run(":8080")
}
