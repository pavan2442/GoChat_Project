package main

import (
	"net/http"
	"time"
	
	

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var secret = []byte("supersecretkey")

func loginUser(c *gin.Context) {
	var user User
	c.BindJSON(&user)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": user.Username,
		"exp": time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString(secret)

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
	})
}
