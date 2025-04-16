package types

type CreateDatabaseRequest struct {
	DSN  string `json:"dsn"`
	Name string `json:"name,omitempty"`
	Type string `json:"type,omitempty"` // "mysql" or "postgres"
}

type ListDatabaseRequest struct {
	DSN  string `json:"dsn"`
	Type string `json:"type,omitempty"` // "mysql" or "postgres"
}

type DeleteDatabaseRequest struct {
	Type string `json:"type"` // "mysql" or "postgres"
	DSN  string `json:"dsn"`
	Name string `json:"name"`
}

type ExecSQLRequest struct {
	Type string `json:"type"` // "mysql" or "postgres"
	DSN  string `json:"dsn"`
	SQL  string `json:"sql"`
}
