package main

import (
	"manageDatabase/internal/api"
)

func main() {
	server := api.NewServer()
	server.Start()
}
