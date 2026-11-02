package config

type Content struct {
	Host       string `json:"host"`
	Port       int    `json:"port"`
	MaxRetries int    `json:"max_retries"`
}
