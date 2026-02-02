package main

import "time"

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
	ID        int64      `json:"id"`
	RoomID    string     `json:"roomId"`
	Username  string     `json:"username"`
	Text      string     `json:"text"`
	Timestamp time.Time  `json:"timestamp"`
	FileURL   string     `json:"fileUrl,omitempty"`
	FileName  string     `json:"fileName,omitempty"`
	Emojis    map[string][]string `json:"emojis,omitempty"`
}

// file upload response
type FileUploadResponse struct {
	URL      string `json:"url"`
	FileName string `json:"fileName"`
}





