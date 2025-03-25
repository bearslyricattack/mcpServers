package main

import (
	"flag"
	"fmt"
	"log"
	"mcp-db/internal/api"
	"mcp-db/internal/k8s"
	"os"
)

func main() {
	var (
		kubeconfigPath string
		port           string
	)

	flag.StringVar(&kubeconfigPath, "kubeconfig", "", "Path to the kubeconfig file")
	flag.StringVar(&port, "port", "8080", "Port for the API server")
	flag.Parse()

	if envPort := os.Getenv("SERVER_PORT"); envPort != "" {
		port = envPort
	}

	client, err := k8s.NewClient(kubeconfigPath)
	if err != nil {
		log.Fatal(err)
	}
	addr := fmt.Sprintf(":%s", port)
	server := api.NewServer(client, addr)
	log.Printf("Starting server on %s...", addr)
	if err := server.Start(); err != nil {
		log.Fatal(err)
	}
}
