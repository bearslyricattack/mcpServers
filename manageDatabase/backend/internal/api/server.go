package api

import (
	"fmt"
	"github.com/gorilla/mux"
	"net/http"
)

type Server struct {
	port   string
	router *mux.Router
}

func NewServer(port string) *Server {
	server := &Server{
		port:   port,
		router: mux.NewRouter(),
	}
	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	api := s.router.PathPrefix("/databases").Subrouter()
	api.HandleFunc("/list", s.ListDatabasesHandler).Methods(http.MethodPost)
	api.HandleFunc("/create", s.CreateDatabaseHandler).Methods(http.MethodPost)
	api.HandleFunc("/delete", s.DeleteDatabaseHandler).Methods(http.MethodPost)
	api.HandleFunc("/exec", s.ExecSQLHandler).Methods(http.MethodPost)
}

func (s *Server) Start() error {
	return http.ListenAndServe(fmt.Sprintf(":%s", s.port), s.router)
}
