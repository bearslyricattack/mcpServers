package api

import (
	"encoding/json"
	"fmt"
	"manageDatabase/internal/database"
	"manageDatabase/pkg/types"
	"net/http"
)

// CreateDatabaseHandler handles database creation requests via POST.
func (s *Server) CreateDatabaseHandler(w http.ResponseWriter, r *http.Request) {
	if !onlyAllowPost(w, r) {
		return
	}

	var req types.CreateDatabaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		fmt.Println("Decode error:", err)
		return
	}

	if err := database.CreateDatabase(req.Type, req.DSN, req.Name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		fmt.Println("CreateDatabase error:", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf("Database '%s' created successfully", req.Name)))
}

// ListDatabasesHandler handles requests to list all databases via POST.
func (s *Server) ListDatabasesHandler(w http.ResponseWriter, r *http.Request) {
	if !onlyAllowPost(w, r) {
		return
	}

	var req types.ListDatabaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		fmt.Println("Decode error:", err)
		return
	}

	databases, err := database.ListDatabases(req.Type, req.DSN)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		fmt.Println("ListDatabases error:", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(databases)
}

// onlyAllowPost validates that the HTTP method is POST.
func onlyAllowPost(w http.ResponseWriter, r *http.Request) bool {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return false
	}
	return true
}

// DeleteDatabaseHandler handles requests to delete a database via POST.
func (s *Server) DeleteDatabaseHandler(w http.ResponseWriter, r *http.Request) {
	if !onlyAllowPost(w, r) {
		return
	}

	var req types.DeleteDatabaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		fmt.Println("Decode error:", err)
		return
	}

	if err := database.DeleteDatabase(req.Type, req.DSN, req.Name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		fmt.Println("DeleteDatabase error:", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf("Database '%s' deleted successfully", req.Name)))
}

// ExecSQLHandler handles execution of custom SQL statements via POST.
func (s *Server) ExecSQLHandler(w http.ResponseWriter, r *http.Request) {
	if !onlyAllowPost(w, r) {
		return
	}

	var req types.ExecSQLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		fmt.Println("Decode error:", err)
		return
	}

	result, err := database.ExecSQL(req.Type, req.DSN, req.SQL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		fmt.Println("ExecSQL error:", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"message": "SQL executed successfully",
		"result":  result,
	})
}
