package types

type CreateDatabaseRequest struct {
	DSN  string `json:"dsn"`
	Name string `json:"name,omitempty"`
}

type ListDatabaseRequest struct {
	DSN string `json:"dsn"`
}
