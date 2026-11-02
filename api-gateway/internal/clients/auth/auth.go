package auth

import (
	"context"
	authv1 "pp2/gen/auth/v1"
	"pp2/internal/config"
	"pp2/internal/models"
	"strconv"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type AuthClient interface {
	ValidateToken(req *models.AuthValidateTokenRequest) (*models.AuthValidateTokenResponse, error)
	RegisterUser(req *models.AuthRegisterUserRequest) (*models.AuthRegisterUserResponse, error)
	LoginUser(req *models.AuthLoginUserRequest) (*models.AuthLoginUserResponse, error)
	SendVerifyCode(req *models.AuthSendVerifyCodeRequest) (*models.AuthSendVerifyCodeResponse, error)
	ConfirmVerifyCode(req *models.AuthConfirmVerifyCodeRequest) (*models.AuthConfirmVerifyCodeResponse, error)
	RefreshUserToken(req *models.AuthRefreshUserTokenRequest) (*models.AuthRefreshUserTokenResponse, error)
	SendPasswordResetCode(req *models.AuthSendPasswordResetCodeRequest) (*models.AuthSendPasswordResetCodeResponse, error)
	ConfirmPasswordResetCode(req *models.AuthConfirmPasswordResetCodeRequest) (*models.AuthConfirmPasswordResetCodeResponse, error)
	ResetPassword(req *models.AuthResetPasswordRequest) (*models.AuthResetPasswordResponse, error)
}

type Client struct {
	log *zap.Logger
	cfg *config.Config
	ctx context.Context
	api authv1.AuthServiceClient
}

func NewAuthClient(log *zap.Logger, cfg *config.Config, ctx context.Context) (AuthClient, error) {
	address := cfg.Auth.Host + ":" + strconv.Itoa(cfg.Auth.Port)

	clientConn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to auth service", zap.Error(err))
		return nil, err
	}
	api := authv1.NewAuthServiceClient(clientConn)
	return &Client{
		log: log,
		cfg: cfg,
		ctx: ctx,
		api: api,
	}, nil
}
func (c *Client) ValidateToken(req *models.AuthValidateTokenRequest) (*models.AuthValidateTokenResponse, error) {
	reqGrpc := &authv1.TokenRequest{
		Token: req.Token,
	}

	resGrpc, err := c.api.ValidateToken(c.ctx, reqGrpc)
	if err != nil {
		return nil, err
	}

	res := &models.AuthValidateTokenResponse{
		Valid:  resGrpc.Valid,
		UserID: resGrpc.UserId,
	}

	return res, nil
}

func (c *Client) RegisterUser(req *models.AuthRegisterUserRequest) (*models.AuthRegisterUserResponse, error) {
	reqGrpc := &authv1.RegisterUserRequest{
		Username:       req.Username,
		Email:          req.Email,
		Password:       req.Password,
		RepeatPassword: req.Password,
	}

	resGrpc, err := c.api.RegisterUser(c.ctx, reqGrpc)
	if err != nil {
		return nil, err
	}

	res := &models.AuthRegisterUserResponse{
		Message:           resGrpc.Message,
		Confirmed:         resGrpc.Confirmed,
		EmailConfirmToken: resGrpc.EmailConfirmToken,
	}

	return res, nil
}

func (c *Client) LoginUser(req *models.AuthLoginUserRequest) (*models.AuthLoginUserResponse, error) {
	reqGrpc := &authv1.LoginUserRequest{
		Username: req.Username,
		Password: req.Password,
	}

	resGrpc, err := c.api.LoginUser(c.ctx, reqGrpc)
	if err != nil {
		return nil, err
	}

	resp := &models.AuthLoginUserResponse{
		Confirmed:         resGrpc.Confirmed,
		AccessToken:       ptrToStr(resGrpc.AccessToken),
		RefreshToken:      ptrToStr(resGrpc.RefreshToken),
		EmailConfirmToken: ptrToStr(resGrpc.EmailConfirmToken),
		Message:           resGrpc.Message,
	}

	return resp, nil
}

func (c *Client) SendVerifyCode(req *models.AuthSendVerifyCodeRequest) (*models.AuthSendVerifyCodeResponse, error) {
	reqGrpc := &authv1.SendVerifyCodeRequest{
		Email:      req.Email,
		EmailToken: req.EmailToken,
	}

	resGrpc, err := c.api.SendVerifyCode(c.ctx, reqGrpc)
	if err != nil {
		return nil, err
	}

	res := &models.AuthSendVerifyCodeResponse{
		Message: resGrpc.Message,
	}

	return res, nil
}

func (c *Client) ConfirmVerifyCode(req *models.AuthConfirmVerifyCodeRequest) (*models.AuthConfirmVerifyCodeResponse, error) {
	reqGrpc := &authv1.ConfirmVerifyCodeRequest{
		Code:       req.Code,
		EmailToken: req.EmailToken,
	}

	resGrpc, err := c.api.ConfirmVerifyCode(c.ctx, reqGrpc)
	if err != nil {
		return nil, err
	}

	res := &models.AuthConfirmVerifyCodeResponse{
		Confirmed:    resGrpc.Confirmed,
		AccessToken:  resGrpc.AccessToken,
		RefreshToken: resGrpc.RefreshToken,
		Message:      resGrpc.Message,
	}

	return res, nil
}

func (c *Client) RefreshUserToken(req *models.AuthRefreshUserTokenRequest) (*models.AuthRefreshUserTokenResponse, error) {
	reqGrpc := &authv1.RefreshUserTokenRequest{
		RefreshToken: req.RefreshToken,
	}

	resGrpc, err := c.api.RefreshUserToken(c.ctx, reqGrpc)
	if err != nil {
		return nil, err
	}

	res := &models.AuthRefreshUserTokenResponse{
		Message:     resGrpc.Message,
		AccessToken: resGrpc.AccessToken,
	}

	return res, nil
}

func (c *Client) SendPasswordResetCode(req *models.AuthSendPasswordResetCodeRequest) (*models.AuthSendPasswordResetCodeResponse, error) {
	reqGrpc := &authv1.SendPasswordResetCodeRequest{
		Email: req.Email,
	}

	resGrpc, err := c.api.SendPasswordResetCode(c.ctx, reqGrpc)
	if err != nil {
		return nil, err
	}

	res := &models.AuthSendPasswordResetCodeResponse{
		Message:        resGrpc.Message,
		ResetPassToken: resGrpc.ResetPassToken,
	}

	return res, nil
}

func (c *Client) ConfirmPasswordResetCode(req *models.AuthConfirmPasswordResetCodeRequest) (*models.AuthConfirmPasswordResetCodeResponse, error) {
	reqGrpc := &authv1.ConfirmPasswordResetCodeRequest{
		Code:           req.Code,
		ResetPassToken: req.ResetPassToken,
	}

	resGrpc, err := c.api.ConfirmPasswordResetCode(c.ctx, reqGrpc)
	if err != nil {
		return nil, err
	}

	res := &models.AuthConfirmPasswordResetCodeResponse{
		Confirmed: resGrpc.Confirmed,
		Message:   resGrpc.Message,
	}

	return res, nil
}

func (c *Client) ResetPassword(req *models.AuthResetPasswordRequest) (*models.AuthResetPasswordResponse, error) {
	reqGrpc := &authv1.ResetPasswordRequest{
		ResetPassToken: req.ResetPassToken,
		NewPassword:    req.NewPassword,
		RepeatPassword: req.NewPassword,
	}

	resGrpc, err := c.api.ResetPassword(c.ctx, reqGrpc)
	if err != nil {
		return nil, err
	}

	res := &models.AuthResetPasswordResponse{
		Success: resGrpc.Success,
		Message: resGrpc.Message,
	}

	return res, nil
}

func ptrToStr(s *string) string {
	if s != nil {
		return *s
	}
	return ""
}
