package models

type AuthValidateTokenRequest struct {
	Token string
}

type AuthValidateTokenResponse struct {
	Valid  bool
	UserID string
}

type AuthRegisterUserRequest struct {
	Username string
	Email    string
	Password string
}

type AuthRegisterUserResponse struct {
	Message           string
	Confirmed         bool
	EmailConfirmToken string
}

type AuthLoginUserRequest struct {
	Username string
	Password string
}

type AuthLoginUserResponse struct {
	Confirmed         bool
	AccessToken       string
	RefreshToken      string
	EmailConfirmToken string
	Message           string
}

type AuthSendVerifyCodeRequest struct {
	Email      string
	EmailToken string
}

type AuthSendVerifyCodeResponse struct {
	Message string
}

type AuthConfirmVerifyCodeRequest struct {
	Code       int32
	EmailToken string
}

type AuthConfirmVerifyCodeResponse struct {
	Confirmed    bool
	AccessToken  string
	RefreshToken string
	Message      string
}

type AuthRefreshUserTokenRequest struct {
	RefreshToken string
}

type AuthRefreshUserTokenResponse struct {
	Message     string
	AccessToken string
}

type AuthSendPasswordResetCodeRequest struct {
	Email string
}

type AuthSendPasswordResetCodeResponse struct {
	Message        string
	ResetPassToken string
}

type AuthConfirmPasswordResetCodeRequest struct {
	Code           int32
	ResetPassToken string
}

type AuthConfirmPasswordResetCodeResponse struct {
	Confirmed bool
	Message   string
}

type AuthResetPasswordRequest struct {
	ResetPassToken string
	NewPassword    string
}

type AuthResetPasswordResponse struct {
	Success bool
	Message string
}
