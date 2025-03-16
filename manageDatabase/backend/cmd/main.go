package main

import (
	"manageDatabase/internal/api"
	"os"
)

func main() {
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}
	server := api.NewServer(port)
	server.Start()
}
