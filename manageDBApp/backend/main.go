package main

import (
	"flag"
	"fmt"
	"log"
	"mcp-db/internal/api"
	"os"
)

func main() {
	var port string
	flag.StringVar(&port, "port", "8080", "Port for the API server")
	flag.Parse()
	if envPort := os.Getenv("SERVER_PORT"); envPort != "" {
		port = envPort
	}
	addr := fmt.Sprintf(":%s", port)
	server := api.NewServer(addr)
	log.Printf("Starting server on %s...", addr)
	if err := server.Start(); err != nil {
		log.Fatal(err)
	}
}
