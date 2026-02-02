package main

// user
type User struct {
	Username string `json:"username"`
}

// chat room
type Room struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// message
type Message struct {
	RoomID   string `json:"roomId"`
	Username string `json:"username"`
	Text     string `json:"text"`
	Time     string `json:"time"`
}





