package api

import (
	"encoding/json"
	"fmt"
	"manageDatabase/internal/database"
	"manageDatabase/pkg/types"
	"net/http"
)

type DBRequest struct {
	DSN    string `json:"dsn"`
	DBName string `json:"db_name"`
}

func (s *Server) CreateDatabaseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "只支持 POST 请求", http.StatusMethodNotAllowed)
		return
	}
	var req DBRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "请求格式错误", http.StatusBadRequest)
		return
	}

	if err := database.CreateDatabase(req.DSN, req.DBName); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf("数据库 %s 创建成功", req.DBName)))
}

func (s *Server) ListDatabasesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "只支持 Post 请求", http.StatusMethodNotAllowed)
		return
	}
	var req types.CreateDatabaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "请求格式错误", http.StatusBadRequest)
		return
	}

	databases, err := database.ListDatabases(req.Address + ":" + req.Port)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(databases)
}
