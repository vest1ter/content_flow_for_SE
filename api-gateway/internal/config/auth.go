package config

type Auth struct {
	Host       string `json:"host"`
	Port       int    `json:"port"`
	MaxRetries int    `json:"max_retries"`
}
