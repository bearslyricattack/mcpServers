package types

type CreateDatabaseRequest struct {
	Name     string `json:"name"`
	Address  string `json:"address"`
	Port     string `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
}
