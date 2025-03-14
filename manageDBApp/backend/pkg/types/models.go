package types

type CreateDatabaseRequest struct {
	Name          string `json:"name"`
	Type          string `json:"type"`
	Version       string `json:"version,omitempty"`
	Namespace     string `json:"namespace,omitempty"`
	CPULimit      string `json:"cpu_limit,omitempty"`
	MemoryLimit   string `json:"memory_limit,omitempty"`
	CPURequest    string `json:"cpu_request,omitempty"`
	MemoryRequest string `json:"memory_request,omitempty"`
	Storage       string `json:"storage,omitempty"`
}

type ListDatabasesRequest struct {
	Namespace string `json:"namespace,omitempty"`
	Type      string `json:"type,omitempty"`
}

type DeleteDatabaseRequest struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
	Token     string `json:"token,omitempty"`
}

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type DBClusterInfo struct {
	Name           string `json:"name"`
	Type           string `json:"type"`
	Version        string `json:"version"`
	Status         string `json:"status"`
	CreatedAt      string `json:"created_at"`
	CPULimit       string `json:"cpu_limit,omitempty"`
	MemoryLimit    string `json:"memory_limit,omitempty"`
	CPURequest     string `json:"cpu_request,omitempty"`
	MemoryRequest  string `json:"memory_request,omitempty"`
	Storage        string `json:"storage,omitempty"`
	AccessMode     string `json:"access_mode,omitempty"`
	Replicas       int64  `json:"replicas,omitempty"`
	ServiceAccount string `json:"service_account,omitempty"`
}

type GetDatabasesRequest struct {
	Namespace string `json:"namespace,omitempty"`
	Database  string `json:"database,omitempty"`
}

type DatabasesResponse struct {
	Dsn      string `json:"dsn"`
	Address  string `json:"address"`
	Port     string `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
}
