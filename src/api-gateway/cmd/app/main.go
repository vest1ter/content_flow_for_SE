package main

import (
	"context"
	"pp2/internal/clients/auth"
	"pp2/internal/clients/business"
	"pp2/internal/clients/content"
	"pp2/internal/config"
	"pp2/internal/controller"
	"time"

	"go.uber.org/zap"
)

func main() {
	log, err := zap.NewProduction()
	if err != nil {
		panic(err)
	}
	defer log.Sync()

	log.Info("successful initialized logger")

	cfg, err := config.New()
	if err != nil {
		log.Fatal("failed to load config", zap.Error(err))
	}

	log.Info("configuration loaded")

	ctx := context.Background()

	var authClient auth.AuthClient

	for i := 0; i < 20; i++ {
		authClient, err = auth.NewAuthClient(log, cfg, ctx)
		if err == nil {
			break
		}
		log.Info("auth service not ready, retrying in 2s...")
		time.Sleep(2 * time.Second)
	}
	var busClient business.BusinessClient
	for i := 0; i < 20; i++ {
		busClient, err = business.NewBusinessClient(log, cfg, ctx)
		if err == nil {
			break
		}
		log.Info("bussiness service not ready, retrying in 2s...")
		time.Sleep(2 * time.Second)
	}

	log.Info("business client created", zap.Any("auth_client", busClient))

	var contentClient content.ContentClient
	for i := 0; i < 20; i++ {
		contentClient, err = content.NewContentClient(log, cfg, ctx)
		if err == nil {
			break
		}
		log.Info("bussiness service not ready, retrying in 2s...")
		time.Sleep(2 * time.Second)
	}

	log.Info("content client created", zap.Any("auth_client", contentClient))
	ctrl, err := controller.NewController(log, cfg, authClient, busClient, contentClient)
	if err != nil {
		log.Fatal("failed to create controller", zap.Error(err))
	}

	if err := ctrl.Start(); err != nil {
		log.Fatal("failed to start server", zap.Error(err))
	}
}
