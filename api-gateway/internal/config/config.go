package config

import (
	"log"

	"github.com/ilyakaznacheev/cleanenv"
)

type Config struct {
	Server   *Server   `json:"server"`
	Auth     *Auth     `json:"auth"`
	Business *Business `json:"business"`
	Content  *Content  `json:"content"`
}

func New() (*Config, error) {
	cfg := &Config{
		Server: &Server{
			Host: "0.0.0.0",
			Port: 8080,
		},
		Auth: &Auth{
			Host:       "0.0.0.0",
			Port:       50051,
			MaxRetries: 3,
		},
		Business: &Business{
			Host:       "0.0.0.0",
			Port:       50053,
			MaxRetries: 3,
		},
		Content: &Content{
			Host:       "0.0.0.0",
			Port:       50052,
			MaxRetries: 3,
		},
	}

	if err := cleanenv.ReadConfig("./config.json", cfg); err != nil {
		log.Fatalf("Failed to read config.json: %v", err)
	}
	return cfg, nil
}
