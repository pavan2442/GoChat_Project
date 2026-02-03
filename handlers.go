package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// fake database (memory only)
var rooms = []Room{
	{ID: "1", Name: "General"},
}

var messages = []Message{}
var messageCounter int64 = 1


// -------- LOGIN --------
func login(c *gin.Context) {
	var user User
	c.BindJSON(&user)
	c.JSON(http.StatusOK, user)
}


// -------- LIST ROOMS --------
func listRooms(c *gin.Context) {
	c.JSON(http.StatusOK, rooms)
}


// -------- CREATE ROOM --------
func createRoom(c *gin.Context) {
	var room Room
	c.BindJSON(&room)

	rooms = append(rooms, room)
	c.JSON(http.StatusOK, room)
}


// -------- GET HISTORY WITH PAGINATION --------
func getMessages(c *gin.Context) {
	roomID := c.Param("id")
	limit := 20
	offset := 0

	// Parse query parameters
	if l := c.Query("limit"); l != "" {
		if parsedLimit, err := strconv.Atoi(l); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if o := c.Query("offset"); o != "" {
		if parsedOffset, err := strconv.Atoi(o); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	roomMsgs := []Message{}
	for _, m := range messages {
		if m.RoomID == roomID {
			roomMsgs = append(roomMsgs, m)
		}
	}

	// Calculate pagination
	start := offset
	end := offset + limit
	if start > len(roomMsgs) {
		start = len(roomMsgs)
	}
	if end > len(roomMsgs) {
		end = len(roomMsgs)
	}

	paginatedMsgs := roomMsgs[start:end]
	if paginatedMsgs == nil {
		paginatedMsgs = []Message{}
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": paginatedMsgs,
		"total":    len(roomMsgs),
		"limit":    limit,
		"offset":   offset,
	})
}


// -------- SAVE MESSAGE --------
func postMessage(c *gin.Context) {
	var msg Message
	if err := c.BindJSON(&msg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message"})
		return
	}

	msg.ID = messageCounter
	msg.Timestamp = time.Now()
	if msg.Emojis == nil {
		msg.Emojis = make(map[string][]string)
	}
	messageCounter++

	messages = append(messages, msg)
	c.JSON(http.StatusOK, msg)
}


// -------- DELETE MESSAGE --------
func deleteMessage(c *gin.Context) {
	roomID := c.Param("id")
	msgID, err := strconv.ParseInt(c.Param("msgId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	// Find and delete message
	for i, m := range messages {
		if m.ID == msgID && m.RoomID == roomID {
			messages = append(messages[:i], messages[i+1:]...)
			c.JSON(http.StatusOK, gin.H{"message": "Message deleted"})
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
}


// -------- ADD EMOJI REACTION --------
func addEmoji(c *gin.Context) {
	msgID, err := strconv.ParseInt(c.Param("msgId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	var req struct {
		Emoji    string `json:"emoji"`
		Username string `json:"username"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Find message and add emoji
	for i, m := range messages {
		if m.ID == msgID {
			if messages[i].Emojis == nil {
				messages[i].Emojis = make(map[string][]string)
			}
			messages[i].Emojis[req.Emoji] = append(messages[i].Emojis[req.Emoji], req.Username)
			c.JSON(http.StatusOK, messages[i])
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
}


// -------- FILE UPLOAD --------
func uploadFile(c *gin.Context) {
	// Create uploads directory if it doesn't exist
	uploadsDir := "./uploads"
	if err := os.MkdirAll(uploadsDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create uploads directory"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file size (max 10MB)
	if file.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large (max 10MB)"})
		return
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%d_%s", timestamp, filepath.Base(file.Filename))
	filepath := filepath.Join(uploadsDir, filename)

	// Save file
	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	c.JSON(http.StatusOK, FileUploadResponse{
		URL:      fmt.Sprintf("/uploads/%s", filename),
		FileName: file.Filename,
	})
}
