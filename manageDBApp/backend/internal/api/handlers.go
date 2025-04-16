package api

import (
	"context"
	"encoding/json"
	"fmt"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"log"
	"mcp-db/internal/k8s"
	"mcp-db/pkg/types"
	"net/http"
	"strings"
)

func (s *Server) CreateDatabase(w http.ResponseWriter, r *http.Request) {
	var req types.CreateDatabaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request format")
		return
	}
	if req.Name == "" {
		respondWithError(w, http.StatusBadRequest, "Database name is required")
		return
	}
	if req.Type == "" {
		respondWithError(w, http.StatusBadRequest, "Database type is required")
	}
	if req.Namespace == "" {
		respondWithError(w, http.StatusBadRequest, "Namespace is required")
	}

	if req.CPULimit == "" {
		req.CPULimit = "1000m"
	}
	if req.MemoryLimit == "" {
		req.MemoryLimit = "1024Mi"
	}
	if req.CPURequest == "" {
		req.CPURequest = "100m"
	}
	if req.MemoryRequest == "" {
		req.MemoryRequest = "102Mi"
	}
	if req.Storage == "" {
		req.Storage = "3Gi"
	}
	if req.Kubeconfig == "" {
		respondWithError(w, http.StatusBadRequest, "Kubeconfig is required")
		return
	}
	var err error
	s.k8sClient, err = k8s.NewClient(req.Kubeconfig)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Kubeconfig is error: "+err.Error())
		return
	}
	ctx := context.Background()
	if err := s.k8sClient.CreateDatabaseCluster(ctx, &req); err != nil {
		log.Printf("Failed to create database cluster: %v", err)
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to create database cluster: %v", err))
		return
	}
	log.Println("Created database cluster successfully")
	respondWithJSON(w, http.StatusCreated, types.Response{
		Success: true,
		Message: fmt.Sprintf("Successfully created database cluster '%s'", req.Name),
	})
}

func (s *Server) ListDatabases(w http.ResponseWriter, r *http.Request) {
	var req types.ListDatabasesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request format")
		return
	}
	if req.Namespace == "" {
		respondWithError(w, http.StatusBadRequest, "Not Found namespace")
	}
	if req.Kubeconfig == "" {
		respondWithError(w, http.StatusBadRequest, "Kubeconfig is required")
		return
	}
	var err error
	s.k8sClient, err = k8s.NewClient(req.Kubeconfig)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "kubectl is error: "+err.Error())
		return
	}
	clusters, err := s.k8sClient.ListDatabaseClusters(req.Namespace)
	if err != nil {
		log.Printf("Failed to get database clusters: %v", err)
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to get database clusters: %v", err))
		return
	}
	log.Println("List of database clusters successfully")
	respondWithJSON(w, http.StatusOK, types.Response{
		Success: true,
		Message: fmt.Sprintf("Found %d database clusters in namespace '%s'", len(clusters), req.Namespace),
		Data:    clusters,
	})
}

func (s *Server) DeleteDatabase(w http.ResponseWriter, r *http.Request) {
	var req types.DeleteDatabaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request format")
		return
	}
	if req.Name == "" {
		respondWithError(w, http.StatusBadRequest, "Database name is required")
		return
	}
	ctx := context.Background()
	if req.Kubeconfig == "" {
		respondWithError(w, http.StatusBadRequest, "KubeConfig is required")
		return
	}
	var err error
	s.k8sClient, err = k8s.NewClient(req.Kubeconfig)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "KubeConfig is error: "+err.Error())
		return
	}
	if err := s.k8sClient.DeleteDatabaseCluster(ctx, req.Name, req.Namespace); err != nil {
		log.Printf("Failed to delete database cluster: %v", err)
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to delete database cluster: %v", err))
		return
	}
	log.Println("Deleted database cluster successfully")
	respondWithJSON(w, http.StatusOK, types.Response{
		Success: true,
		Message: fmt.Sprintf("Successfully deleted database cluster '%s'", req.Name),
	})
}

func (s *Server) GetDatabaseConn(w http.ResponseWriter, r *http.Request) {
	var req types.GetDatabasesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, fmt.Sprintf("Invalid request format: %s", err.Error()))
		return
	}
	if req.Namespace == "" {
		respondWithError(w, http.StatusBadRequest, "Namespace is required")
	}
	if req.Name == "" {
		respondWithError(w, http.StatusBadRequest, "Database name is required")
	}
	if req.Kubeconfig == "" {
		respondWithError(w, http.StatusBadRequest, "KubeConfig is required")
		return
	}
	var err error
	s.k8sClient, err = k8s.NewClient(req.Kubeconfig)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "KubeConfig is error: "+err.Error())
		return
	}
	secretName := fmt.Sprintf("%s-conn-credential", req.Name)
	secret, err := s.k8sClient.ClientSet.CoreV1().Secrets(req.Namespace).Get(context.TODO(), secretName, metav1.GetOptions{})
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "database is not exist.")
		log.Printf("Failed to get database connection secret: %v", err)
		return
	}

	var res types.DatabasesResponse
	var dbType string
	for key, value := range secret.Data {
		if key == "username" {
			res.Username = string(value)
		}
		if key == "password" {
			res.Password = string(value)
		}
		if key == "host" {
			dbType = strings.SplitN(string(value), "-", 2)[1]
			res.Address = fmt.Sprintf("%s.%s.svc", string(value), req.Namespace)
		}
		if key == "port" {
			res.Port = string(value)
		}
	}
	var dsn = fmt.Sprintf("%s://%s:%s@%s:%s", dbType, res.Username, res.Password, res.Address, res.Port)
	log.Println("found database connection successfully")
	respondWithJSON(w, http.StatusOK, types.Response{
		Success: true,
		Message: fmt.Sprintf("Found database connect clusters in namespace '%s'", req.Namespace),
		Data:    dsn,
	})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, types.Response{
		Success: false,
		Message: message,
	})
}
