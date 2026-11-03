package controller

import (
	"context"
	"pp2/internal/clients/auth"
	"pp2/internal/clients/business"
	"pp2/internal/clients/content"
	"pp2/internal/config"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"go.uber.org/zap"
)

type Controller struct {
	log     *zap.Logger
	cfg     *config.Config
	auth    auth.AuthClient
	bus     business.BusinessClient
	content content.ContentClient
	ctx     context.Context
	serv    *echo.Echo
}

func (ctrl *Controller) configureRoutes() {
	api := ctrl.serv.Group("/api/v1")

	auth := api.Group("/auth")
	auth.POST("/register", ctrl.handleRegisterUser)
	auth.POST("/confirm", ctrl.handleConfirmVerifyCode)
	auth.POST("/login", ctrl.handleLoignUser)
	auth.POST("/refresh", ctrl.handleRefreshUserToken)
	auth.POST("/send-password-reset", ctrl.handleSendPasswordResetCode)
	auth.POST("/confirm-password-reset", ctrl.handleConfirmPasswordResetCode)
	auth.POST("/reset-password", ctrl.handleResetPassword)

	business := api.Group("/business")
	business.POST("/create", ctrl.handleCreateBusiness)
	business.GET("/get/:id", ctrl.handleGetBusinessByID)
	business.PUT("/update/:id", ctrl.handleUpdateBusinessByID)
	business.DELETE("/delete/:id", ctrl.handleDeleteBusinessByID)
	business.GET("", ctrl.handleListBusinesses)
	business.PUT("/set/:id", ctrl.handleSetActiveBusiness)
	business.GET("/active", ctrl.handleGetActiveBusiness)

	content := api.Group("/content")
	content.GET("/telegram_channel", ctrl.handleAnalyzeTelegramChannel)
	content.POST("/generate_post_telegram/:id", ctrl.handleGeneratePostFromTelegramPosts)
	content.POST("/generate_post/:id", ctrl.handleGenerateBusinessPost)
	content.POST("/generate_content_plan/:id", ctrl.handleGenerateContentPlan)
	content.POST("/plan/:id", ctrl.handleGetContentPlan)
}

func NewController(log *zap.Logger, cfg *config.Config, authClient auth.AuthClient, busClient business.BusinessClient, contentClinet content.ContentClient) (*Controller, error) {
	ctrl := &Controller{
		log:     log,
		cfg:     cfg,
		auth:    authClient,
		bus:     busClient,
		content: contentClinet,
		ctx:     context.Background(),
		serv:    echo.New(),
	}
	ctrl.serv.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.DELETE, echo.OPTIONS},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	ctrl.configureRoutes()

	return ctrl, nil
}

func (ctrl *Controller) Start() error {
	ctrl.log.Info("starting server on 0.0.0.0:8080")
	return ctrl.serv.Start("0.0.0.0:8080")
}
