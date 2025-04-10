package api

import (
	"github.com/gorilla/mux"
	"mcp-db/internal/k8s"
	"net/http"
)

type Server struct {
	router    *mux.Router
	k8sClient *k8s.Client
	addr      string
}

func NewServer(addr string) *Server {
	server := &Server{
		router: mux.NewRouter(),
		addr:   addr,
	}
	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	api := s.router.PathPrefix("/databases").Subrouter()
	api.HandleFunc("/list", s.ListDatabases).Methods(http.MethodPost)
	api.HandleFunc("/create", s.CreateDatabase).Methods(http.MethodPost)
	api.HandleFunc("/delete", s.DeleteDatabase).Methods(http.MethodPost)
	api.HandleFunc("/connect", s.GetDatabaseConn).Methods(http.MethodPost)
}

func (s *Server) Start() error {
	return http.ListenAndServe(s.addr, s.router)
}
