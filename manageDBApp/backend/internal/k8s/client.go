package k8s

import (
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"log"
)

type Client struct {
	ClientSet     *kubernetes.Clientset
	DynamicClient dynamic.Interface
}

func NewClient(kubeconfig string) (*Client, error) {
	cfg, err := NewConfigFromString(kubeconfig)
	if err != nil {
		log.Fatal(err)
	}
	clientSet, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		return nil, err
	}
	dynamicClient, err := dynamic.NewForConfig(cfg)
	if err != nil {
		return nil, err
	}
	dynamicClient, err = dynamic.NewForConfig(cfg)
	if err != nil {
		return nil, err
	}
	return &Client{
		ClientSet:     clientSet,
		DynamicClient: dynamicClient,
	}, nil
}

func NewConfigFromString(kubeconfig string) (*rest.Config, error) {
	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(kubeconfig))
	if err != nil {
		return nil, err
	}
	return config, nil
}
