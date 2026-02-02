package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// fake database (memory only)
var rooms = []Room{
	{ID: "1", Name: "General"},
}

var messages = []Message{}


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


// -------- GET HISTORY --------
func getMessages(c *gin.Context) {
	roomID := c.Param("id")

	roomMsgs := []Message{}


	for _, m := range messages {
		if m.RoomID == roomID {
			roomMsgs = append(roomMsgs, m)
		}
	}

	c.JSON(http.StatusOK, roomMsgs)
}


// -------- SAVE MESSAGE --------
func postMessage(c *gin.Context) {
	var msg Message
	c.BindJSON(&msg)

	messages = append(messages, msg)
	c.JSON(http.StatusOK, msg)
}
