package main

import (
	"flag"
	"log"
	"mcp-db/internal/api"
	"mcp-db/internal/k8s"
)

func main() {
	// 定义命令行参数
	var (
		kubeconfigPath string
	)
	flag.StringVar(&kubeconfigPath, "kubeconfig", "", "Path to the kubeconfig file")
	flag.Parse()
	client, err := k8s.NewClient(kubeconfigPath)
	if err != nil {
		log.Fatal(err)
	}
	server := api.NewServer(client)

	server.Start()
}
