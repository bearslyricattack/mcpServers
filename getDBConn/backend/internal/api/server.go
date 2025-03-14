package api

import (
	"github.com/gorilla/mux"
	"net/http"
)

type Server struct {
	router *mux.Router
}

func NewServer() *Server {
	server := &Server{
		router: mux.NewRouter(),
	}
	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	api := s.router.PathPrefix("/databases").Subrouter()
	api.HandleFunc("/list", s.ListDatabasesHandler).Methods(http.MethodPost)
	api.HandleFunc("/create", s.CreateDatabaseHandler).Methods(http.MethodPost)
}

func (s *Server) Start() error {
	return http.ListenAndServe(":8080", s.router)
}
