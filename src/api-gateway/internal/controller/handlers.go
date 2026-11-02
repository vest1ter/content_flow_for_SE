package controller

import (
	"bytes"
	"encoding/base64"
	"io"
	"net/http"
	"pp2/internal/domain"
	"pp2/internal/models"
	"strconv"
	"strings"
	"unicode"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func getStringValue(ptr *string) string {
	if ptr == nil {
		return "<nil>"
	}
	return *ptr
}

func (ctrl *Controller) handleRegisterUser(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] POST /api/v1/auth/register - Register user request received")
	var req domain.RegisterUserRequest
	if err := c.Bind(&req); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind register user request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request payload",
		})
	}

	ctrl.log.Info("📥 [API Gateway] Register request data",
		zap.String("email", req.Email),
		zap.String("username", req.Username),
		zap.Bool("username_equals_email", req.Username == req.Email),
		zap.Int("password_length", len(req.Password)))

	if !strings.Contains(req.Email, "@") {
		ctrl.log.Warn("⚠️ [API Gateway] Invalid email format (no @)", zap.String("email", req.Email))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "email must contain @",
		})
	}

	if len(req.Password) < 5 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "password must be at least 5 characters long",
		})
	}

	hasDigit := false
	for _, r := range req.Password {
		if unicode.IsDigit(r) {
			hasDigit = true
			break
		}
	}

	if !hasDigit {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "password must contain at least one digit",
		})
	}

	reqRegisterUser := &models.AuthRegisterUserRequest{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
	}

	ctrl.log.Info("📤 [API Gateway] Calling auth service RegisterUser",
		zap.String("email", req.Email),
		zap.String("username", reqRegisterUser.Username),
		zap.Bool("username_equals_email", reqRegisterUser.Username == reqRegisterUser.Email))
	respRegisterUser, err := ctrl.auth.RegisterUser(reqRegisterUser)
	if err != nil {
		st, ok := status.FromError(err)
		if !ok {
			ctrl.log.Error("❌ [API Gateway] Unknown error from auth service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		}

		ctrl.log.Error("❌ [API Gateway] Auth service RegisterUser failed",
			zap.String("error_code", st.Code().String()),
			zap.String("error_message", st.Message()))

		switch st.Code() {
		case codes.InvalidArgument:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": st.Message(),
			})
		case codes.AlreadyExists:
			return c.JSON(http.StatusConflict, map[string]string{
				"error": st.Message(),
			})
		case codes.Internal:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "unexpected error",
			})
		}
	}

	ctrl.log.Info("✅ [API Gateway] Auth service RegisterUser success",
		zap.Bool("confirmed", respRegisterUser.Confirmed),
		zap.String("email_token_prefix", respRegisterUser.EmailConfirmToken[:min(10, len(respRegisterUser.EmailConfirmToken))]))

	reqSendEmail := &models.AuthSendVerifyCodeRequest{
		Email:      req.Email,
		EmailToken: respRegisterUser.EmailConfirmToken,
	}

	ctrl.log.Info("📧 [API Gateway] Sending verification email",
		zap.String("email", req.Email),
		zap.String("email_token_prefix", reqSendEmail.EmailToken[:min(10, len(reqSendEmail.EmailToken))]))

	respSendEndEmail, err := ctrl.auth.SendVerifyCode(reqSendEmail)
	if err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to send verification email", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to send verification email",
		})
	}

	ctrl.log.Info("✅ [API Gateway] Verification email sent successfully", zap.String("message", respSendEndEmail.Message))

	resp := &domain.RegisterUserResponse{
		Confirmed:         respRegisterUser.Confirmed,
		EmailConfirmToken: respRegisterUser.EmailConfirmToken,
		EmailMessage:      respSendEndEmail.Message,
		UserMessage:       respRegisterUser.Message,
	}

	ctrl.log.Info("✅ [API Gateway] Register user completed successfully", zap.String("email", req.Email))
	return c.JSON(http.StatusCreated, resp)
}

func (ctrl *Controller) handleConfirmVerifyCode(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] POST /api/v1/auth/confirm - Confirm verify code request received")
	
	// Логируем сырое тело запроса для диагностики
	if c.Request().Body != nil {
		bodyBytes, _ := io.ReadAll(c.Request().Body)
		c.Request().Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		ctrl.log.Info("📋 [API Gateway] Raw request body", zap.String("body", string(bodyBytes)))
	}
	
	var req domain.ConfirmVerifyCodeRequest
	if err := c.Bind(&req); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind confirm verify code request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request payload",
		})
	}

	ctrl.log.Info("📥 [API Gateway] Confirm verify code data",
		zap.Int32("code", req.Code),
		zap.String("email_token_prefix", req.EmailToken[:min(10, len(req.EmailToken))]))

	reqConfirmVerifyCode := &models.AuthConfirmVerifyCodeRequest{
		Code:       req.Code,
		EmailToken: req.EmailToken,
	}

	ctrl.log.Info("📤 [API Gateway] Sending verification code to auth service",
		zap.Int32("verification_code", reqConfirmVerifyCode.Code),
		zap.String("email_token_prefix", reqConfirmVerifyCode.EmailToken[:min(10, len(reqConfirmVerifyCode.EmailToken))]),
		zap.String("message", "Отправка кода подтверждения в Auth Service"))
	
	respConfirmVerifyCode, err := ctrl.auth.ConfirmVerifyCode(reqConfirmVerifyCode)
	if err != nil {
		st, ok := status.FromError(err)
		if !ok {
			ctrl.log.Error("❌ [API Gateway] Unknown error from auth service when confirming code",
				zap.Int32("code_attempted", reqConfirmVerifyCode.Code),
				zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		}

		ctrl.log.Warn("⚠️ [API Gateway] Auth service rejected verification code",
			zap.Int32("code_attempted", reqConfirmVerifyCode.Code),
			zap.String("error_code", st.Code().String()),
			zap.String("error_message", st.Message()))

		switch st.Code() {
		case codes.InvalidArgument:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": st.Message(),
			})
		case codes.Internal:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "unexpected error",
			})
		}
	}

	ctrl.log.Info("✅ [API Gateway] Auth service ConfirmVerifyCode success",
		zap.Int32("verification_code_accepted", reqConfirmVerifyCode.Code),
		zap.Bool("confirmed", respConfirmVerifyCode.Confirmed),
		zap.String("access_token_prefix", respConfirmVerifyCode.AccessToken[:min(10, len(respConfirmVerifyCode.AccessToken))]),
		zap.String("message", "Код подтверждения успешно принят Auth Service"))

	resp := &domain.ConfirmVerifyCodeResponse{
		Confirmed:    respConfirmVerifyCode.Confirmed,
		AccessToken:  respConfirmVerifyCode.AccessToken,
		RefreshToken: respConfirmVerifyCode.RefreshToken,
		Message:      respConfirmVerifyCode.Message,
	}

	ctrl.log.Info("✅ [API Gateway] Confirm verify code completed successfully")
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleLoignUser(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] POST /api/v1/auth/login - Login user request received")
	var req domain.LoginUserRequest
	if err := c.Bind(&req); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind login user request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request payload",
		})
	}

	ctrl.log.Info("📥 [API Gateway] Login request data",
		zap.String("username", req.Username),
		zap.Int("password_length", len(req.Password)))

	reqLoginUser := &models.AuthLoginUserRequest{
		Username: req.Username,
		Password: req.Password,
	}

	ctrl.log.Info("📤 [API Gateway] Calling auth service LoginUser")
	respLoginUser, err := ctrl.auth.LoginUser(reqLoginUser)
	if err != nil {
		st, ok := status.FromError(err)
		if !ok {
			ctrl.log.Error("unknown error from auth service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		}

		switch st.Code() {
		case codes.InvalidArgument:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": st.Message(),
			})
		case codes.Internal:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "unexpected error",
			})
		}
	}

	ctrl.log.Info("✅ [API Gateway] Auth service LoginUser success",
		zap.Bool("confirmed", respLoginUser.Confirmed),
		zap.String("access_token_prefix", respLoginUser.AccessToken[:min(10, len(respLoginUser.AccessToken))]))

	resp := &domain.LoginUserResponse{
		Confirmed:         respLoginUser.Confirmed,
		AccessToken:       respLoginUser.AccessToken,
		RefreshToken:      respLoginUser.RefreshToken,
		EmailConfirmToken: respLoginUser.EmailConfirmToken,
		Message:           respLoginUser.Message,
	}

	if !respLoginUser.Confirmed {
		ctrl.log.Warn("⚠️ [API Gateway] User not confirmed, returning 403")
		return c.JSON(http.StatusForbidden, resp)
	}

	ctrl.log.Info("✅ [API Gateway] Login completed successfully", zap.String("username", req.Username))
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleRefreshUserToken(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] POST /api/v1/auth/refresh - Refresh token request received")
	var req domain.RefreshUserTokenRequest
	if err := c.Bind(&req); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind refresh user token request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request payload",
		})
	}

	ctrl.log.Info("📥 [API Gateway] Refresh token data",
		zap.String("refresh_token_prefix", req.RefreshToken[:min(10, len(req.RefreshToken))]))

	reqRefreshUserToken := &models.AuthRefreshUserTokenRequest{
		RefreshToken: req.RefreshToken,
	}

	ctrl.log.Info("📤 [API Gateway] Calling auth service RefreshUserToken")
	respRefreshUserToken, err := ctrl.auth.RefreshUserToken(reqRefreshUserToken)
	if err != nil {
		st, ok := status.FromError(err)
		if !ok {
			ctrl.log.Error("❌ [API Gateway] Unknown error from auth service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		}

		ctrl.log.Error("❌ [API Gateway] Auth service RefreshUserToken failed",
			zap.String("error_code", st.Code().String()),
			zap.String("error_message", st.Message()))

		switch st.Code() {
		case codes.Unauthenticated:
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": st.Message(),
			})
		case codes.Internal:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "unexpected error",
			})
		}
	}

	ctrl.log.Info("✅ [API Gateway] Auth service RefreshUserToken success",
		zap.String("access_token_prefix", respRefreshUserToken.AccessToken[:min(10, len(respRefreshUserToken.AccessToken))]))

	resp := &domain.RefreshUserTokenResponse{
		Message:     respRefreshUserToken.Message,
		AccessToken: respRefreshUserToken.AccessToken,
	}

	ctrl.log.Info("✅ [API Gateway] Refresh token completed successfully")
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleSendPasswordResetCode(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] POST /api/v1/auth/send-password-reset - Send password reset code request received")
	
	// Для восстановления пароля авторизация не требуется - пользователь забыл пароль
	var req domain.SendPasswordResetCodeRequest
	if err := c.Bind(&req); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind send password reset code request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request payload",
		})
	}

	ctrl.log.Info("📥 [API Gateway] Send password reset code request data",
		zap.String("email", req.Email))

	reqSendPasswordResetCode := &models.AuthSendPasswordResetCodeRequest{
		Email: req.Email,
	}

	ctrl.log.Info("📤 [API Gateway] Calling auth service SendPasswordResetCode")

	respSendPasswordResetCode, err := ctrl.auth.SendPasswordResetCode(reqSendPasswordResetCode)
	if err != nil {
		st, ok := status.FromError(err)
		if !ok {
			ctrl.log.Error("❌ [API Gateway] Unknown error from auth service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		}

		ctrl.log.Error("❌ [API Gateway] Auth service SendPasswordResetCode failed",
			zap.String("error_code", st.Code().String()),
			zap.String("error_message", st.Message()))

		switch st.Code() {
		case codes.NotFound:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": st.Message(),
			})
		case codes.Internal:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "unexpected error",
			})
		}
	}

	ctrl.log.Info("✅ [API Gateway] Auth service SendPasswordResetCode success",
		zap.String("reset_pass_token_prefix", respSendPasswordResetCode.ResetPassToken[:min(10, len(respSendPasswordResetCode.ResetPassToken))]))

	resp := &domain.SendPasswordResetCodeResponse{
		Message:        respSendPasswordResetCode.Message,
		ResetPassToken: respSendPasswordResetCode.ResetPassToken,
	}
	
	ctrl.log.Info("✅ [API Gateway] Send password reset code completed successfully")
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleConfirmPasswordResetCode(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] POST /api/v1/auth/confirm-password-reset - Confirm password reset code request received")
	
	// Для подтверждения кода восстановления пароля авторизация не требуется
	var req domain.ConfirmPasswordResetCodeRequest
	if err := c.Bind(&req); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind confirm password reset code request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request payload",
		})
	}

	ctrl.log.Info("📥 [API Gateway] Confirm password reset code request data",
		zap.Int32("code", req.Code),
		zap.String("reset_pass_token_prefix", req.ResetPassToken[:min(10, len(req.ResetPassToken))]))

	reqConfirmPasswordResetCode := &models.AuthConfirmPasswordResetCodeRequest{
		Code:           req.Code,
		ResetPassToken: req.ResetPassToken,
	}

	ctrl.log.Info("📤 [API Gateway] Calling auth service ConfirmPasswordResetCode")

	respConfirmPasswordResetCode, err := ctrl.auth.ConfirmPasswordResetCode(reqConfirmPasswordResetCode)
	if err != nil {
		st, ok := status.FromError(err)
		if !ok {
			ctrl.log.Error("❌ [API Gateway] Unknown error from auth service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		}

		ctrl.log.Error("❌ [API Gateway] Auth service ConfirmPasswordResetCode failed",
			zap.String("error_code", st.Code().String()),
			zap.String("error_message", st.Message()))

		switch st.Code() {
		case codes.Unauthenticated:
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Токен сброса пароля не найден или истек. Пожалуйста, запросите код заново.",
			})
		case codes.InvalidArgument:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": st.Message(),
			})
		case codes.NotFound:
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": st.Message(),
			})
		case codes.Internal:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "unexpected error",
			})
		}
	}

	ctrl.log.Info("✅ [API Gateway] Auth service ConfirmPasswordResetCode success",
		zap.Bool("confirmed", respConfirmPasswordResetCode.Confirmed))

	resp := &domain.ConfirmPasswordResetCodeResponse{
		Confirmed: respConfirmPasswordResetCode.Confirmed,
		Message:   respConfirmPasswordResetCode.Message,
	}

	ctrl.log.Info("✅ [API Gateway] Confirm password reset code completed successfully")
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleResetPassword(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] POST /api/v1/auth/reset-password - Reset password request received")
	
	// Для установки нового пароля авторизация не требуется - используется reset_pass_token
	var req domain.ResetPasswordRequest
	if err := c.Bind(&req); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind reset password request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request payload",
		})
	}

	ctrl.log.Info("📥 [API Gateway] Reset password request data",
		zap.String("reset_pass_token_prefix", req.ResetPassToken[:min(10, len(req.ResetPassToken))]),
		zap.Int("new_password_length", len(req.NewPassword)))

	reqResetPassword := &models.AuthResetPasswordRequest{
		ResetPassToken: req.ResetPassToken,
		NewPassword:    req.NewPassword,
	}

	ctrl.log.Info("📤 [API Gateway] Calling auth service ResetPassword")

	respResetPassword, err := ctrl.auth.ResetPassword(reqResetPassword)
	if err != nil {
		st, ok := status.FromError(err)
		if !ok {
			ctrl.log.Error("❌ [API Gateway] Unknown error from auth service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		}

		ctrl.log.Error("❌ [API Gateway] Auth service ResetPassword failed",
			zap.String("error_code", st.Code().String()),
			zap.String("error_message", st.Message()))

		switch st.Code() {
		case codes.Unauthenticated:
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Токен сброса пароля не найден или истек. Пожалуйста, запросите код заново.",
			})
		case codes.InvalidArgument:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": st.Message(),
			})
		case codes.NotFound:
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": st.Message(),
			})
		case codes.Internal:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "unexpected error",
			})
		}
	}

	if !respResetPassword.Success {
		ctrl.log.Warn("⚠️ [API Gateway] Password reset failed - success=false")
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "failed to reset password",
		})
	}

	ctrl.log.Info("✅ [API Gateway] Auth service ResetPassword success",
		zap.Bool("success", respResetPassword.Success))

	resp := &domain.ResetPasswordResponse{
		Success: respResetPassword.Success,
		Message: respResetPassword.Message,
	}
	
	ctrl.log.Info("✅ [API Gateway] Reset password completed successfully")
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleCreateBusiness(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] POST /api/v1/business/create - Create business request received")
	
	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		ctrl.log.Warn("⚠️ [API Gateway] Missing Authorization header in create business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "missing Authorization header",
		})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		ctrl.log.Warn("⚠️ [API Gateway] Invalid Authorization header format in create business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "invalid Authorization header format",
		})
	}
	token := parts[1]

	var req domain.CreateBusinessRequest
	if err := c.Bind(&req); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind create business request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request payload",
		})
	}

	ctrl.log.Info("📥 [API Gateway] Create business request data",
		zap.String("name", req.Name),
		zap.String("industry", req.Industry),
		zap.String("region", req.Region),
		zap.String("communication_style", req.CommunicationStyle),
		zap.Int("logo_length", len(req.Logo)),
		zap.String("token_prefix", token[:min(10, len(token))]))

	switch req.CommunicationStyle {
	case "formal", "friendly", "professional":
	default:
		ctrl.log.Error("❌ [API Gateway] Invalid communication_style",
			zap.String("value", req.CommunicationStyle),
		)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid communication_style",
		})
	}

	// Декодируем base64 строку в байты изображения
	var logoBytes []byte
	if req.Logo != "" {
		// Если logo начинается с "data:image/...;base64,", убираем префикс
		logoStr := req.Logo
		if idx := strings.Index(logoStr, ","); idx != -1 {
			logoStr = logoStr[idx+1:]
		}
		
		var err error
		logoBytes, err = base64.StdEncoding.DecodeString(logoStr)
		if err != nil {
			ctrl.log.Error("❌ [API Gateway] Failed to decode base64 logo", zap.Error(err))
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "invalid logo base64 format",
			})
		}
	}

	reqBus := &models.BusinessCreateRequest{
		AccessToken:        token,
		Name:               req.Name,
		Industry:           req.Industry,
		AudienceReach:      req.AudienceReach,
		Region:             req.Region,
		Description:        req.Description,
		LogoBytes:          logoBytes,
		CommunicationStyle: req.CommunicationStyle,
	}

	ctrl.log.Info("📤 [API Gateway] Calling business service CreateBusiness",
		zap.String("business_name", reqBus.Name),
		zap.String("industry", reqBus.Industry))

	business, err := ctrl.bus.CreateBusiness(reqBus)
	if err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to create business", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to create business",
		})
	}

	ctrl.log.Info("✅ [API Gateway] Business service CreateBusiness success",
		zap.String("business_id", business.Business.ID),
		zap.String("business_name", business.Business.Name))

	resp := domain.CreateBusinessResponse{
		Business: &domain.Business{
			ID:                 business.Business.ID,
			UserID:             business.Business.UserID,
			Name:               business.Business.Name,
			Industry:           business.Business.Industry,
			AudienceReach:      business.Business.AudienceReach,
			Region:             business.Business.Region,
			Description:        business.Business.Description,
			LogoUrl:            business.Business.LogoUrl,
			LogoBase64:         business.Business.LogoBase64,
			CommunicationStyle: business.Business.CommunicationStyle,
			IsActive:           business.Business.IsActive,
			CreatedAt:          business.Business.CreatedAt,
			UpdatedAt:          business.Business.UpdatedAt,
		},
	}

	ctrl.log.Info("✅ [API Gateway] Create business completed successfully",
		zap.String("business_id", business.Business.ID))
	return c.JSON(http.StatusCreated, resp)
}

func (ctrl *Controller) handleGetBusinessByID(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] GET /api/v1/business/get/:id - Get business by ID request received")
	
	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		ctrl.log.Warn("⚠️ [API Gateway] Missing Authorization header in get business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "missing Authorization header",
		})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		ctrl.log.Warn("⚠️ [API Gateway] Invalid Authorization header format in get business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "invalid Authorization header format",
		})
	}
	token := parts[1]

	id := c.Param("id")
	if id == "" {
		ctrl.log.Error("❌ [API Gateway] Missing business id in path")
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "missing business id",
		})
	}

	ctrl.log.Info("📥 [API Gateway] Get business request data",
		zap.String("business_id", id),
		zap.String("token_prefix", token[:min(10, len(token))]))

	req := &models.GetBusinessRequest{
		BusinessID:  id,
		AccessToken: token,
	}

	ctrl.log.Info("📤 [API Gateway] Calling business service GetBusiness",
		zap.String("business_id", req.BusinessID))

	business, err := ctrl.bus.GetBusiness(req)
	if err != nil {
		st, ok := status.FromError(err)
		if ok {
			ctrl.log.Warn("⚠️ [API Gateway] Business service GetBusiness failed",
				zap.String("business_id", id),
				zap.String("error_code", st.Code().String()),
				zap.String("error_message", st.Message()))
			switch st.Code() {
			case codes.NotFound:
				return c.JSON(http.StatusNotFound, map[string]string{
					"error": st.Message(),
				})
			case codes.Unauthenticated:
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": st.Message(),
				})
			case codes.PermissionDenied:
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": st.Message(),
				})
			case codes.Internal:
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "internal server error",
				})
			default:
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "unexpected error",
				})
			}
		} else {
			ctrl.log.Error("❌ [API Gateway] Unknown error from business service GetBusiness",
				zap.String("business_id", id),
				zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal server error",
			})
		}
	}

	ctrl.log.Info("✅ [API Gateway] Business service GetBusiness success",
		zap.String("business_id", business.Business.ID),
		zap.String("business_name", business.Business.Name))

	resp := domain.GetBusinessResponse{
		Business: &domain.Business{
			ID:                 business.Business.ID,
			UserID:             business.Business.UserID,
			Name:               business.Business.Name,
			Industry:           business.Business.Industry,
			AudienceReach:      business.Business.AudienceReach,
			Region:             business.Business.Region,
			Description:        business.Business.Description,
			LogoUrl:            business.Business.LogoUrl,
			LogoBase64:         business.Business.LogoBase64,
			CommunicationStyle: business.Business.CommunicationStyle,
			IsActive:           business.Business.IsActive,
			CreatedAt:          business.Business.CreatedAt,
			UpdatedAt:          business.Business.UpdatedAt,
		},
	}

	ctrl.log.Info("✅ [API Gateway] Get business by ID completed successfully",
		zap.String("business_id", business.Business.ID))
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleUpdateBusinessByID(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] PUT /api/v1/business/update/:id - Update business by ID request received")
	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		ctrl.log.Warn("⚠️ [API Gateway] Missing Authorization header in update business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "missing Authorization header",
		})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		ctrl.log.Warn("⚠️ [API Gateway] Invalid Authorization header format in update business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "invalid Authorization header format",
		})
	}
	token := parts[1]

	id := c.Param("id")
	if id == "" {
		ctrl.log.Error("❌ [API Gateway] Missing business id in path")
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "missing business id",
		})
	}

	var req domain.UpdateBusinessRequest
	if err := c.Bind(&req); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind update business request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request payload",
		})
	}

	// Логируем все поля, полученные с фронта
	ctrl.log.Info("📥 [API Gateway] Update business request received from frontend",
		zap.String("business_id", id),
		zap.String("name", getStringValue(req.Name)),
		zap.String("industry", getStringValue(req.Industry)),
		zap.String("audience_reach", getStringValue(req.AudienceReach)),
		zap.String("region", getStringValue(req.Region)),
		zap.String("description", getStringValue(req.Description)),
		zap.String("communication_style", getStringValue(req.CommunicationStyle)),
		zap.String("logo", func() string {
			if req.Logo != "" {
				if len(req.Logo) > 100 {
					return req.Logo[:100] + "... (truncated)"
				}
				return req.Logo
			}
			return "empty"
		}()),
		zap.Int("logo_length", len(req.Logo)),
		zap.Bool("has_name", req.Name != nil),
		zap.Bool("has_industry", req.Industry != nil),
		zap.Bool("has_audience_reach", req.AudienceReach != nil),
		zap.Bool("has_region", req.Region != nil),
		zap.Bool("has_description", req.Description != nil),
		zap.Bool("has_communication_style", req.CommunicationStyle != nil),
		zap.Bool("has_logo", req.Logo != ""),
		zap.String("token_prefix", token[:min(10, len(token))]))

	// Декодируем base64 строку в байты изображения
	var logoBytes []byte
	if req.Logo != "" {
		// Если logo начинается с "data:image/...;base64,", убираем префикс
		logoStr := req.Logo
		if idx := strings.Index(logoStr, ","); idx != -1 {
			logoStr = logoStr[idx+1:]
		}
		
		var err error
		logoBytes, err = base64.StdEncoding.DecodeString(logoStr)
		if err != nil {
			ctrl.log.Error("❌ [API Gateway] Failed to decode base64 logo", zap.Error(err))
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "invalid logo base64 format",
			})
		}
	}

	reqUpdate := &models.UpdateBusinessRequest{
		BusinessId:         id,
		Name:               req.Name,
		Industry:           req.Industry,
		AudienceReach:      req.AudienceReach,
		Region:             req.Region,
		Description:        req.Description,
		LogoBytes:          logoBytes,
		CommunicationStyle: req.CommunicationStyle,
		AccessToken:        token,
	}

	ctrl.log.Info("📤 [API Gateway] Calling business service UpdateBusiness",
		zap.String("business_id", id),
		zap.String("name", getStringValue(reqUpdate.Name)),
		zap.String("industry", getStringValue(reqUpdate.Industry)),
		zap.String("audience_reach", getStringValue(reqUpdate.AudienceReach)),
		zap.String("region", getStringValue(reqUpdate.Region)),
		zap.String("description", getStringValue(reqUpdate.Description)),
		zap.String("communication_style", getStringValue(reqUpdate.CommunicationStyle)),
		zap.Int("logo_bytes_length", len(reqUpdate.LogoBytes)),
		zap.Bool("has_name", reqUpdate.Name != nil),
		zap.Bool("has_industry", reqUpdate.Industry != nil),
		zap.Bool("has_audience_reach", reqUpdate.AudienceReach != nil),
		zap.Bool("has_region", reqUpdate.Region != nil),
		zap.Bool("has_description", reqUpdate.Description != nil),
		zap.Bool("has_communication_style", reqUpdate.CommunicationStyle != nil),
		zap.Bool("has_logo", len(reqUpdate.LogoBytes) > 0))

	business, err := ctrl.bus.UpdateBusiness(reqUpdate)
	if err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to update business",
			zap.String("business_id", id),
			zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to update business",
		})
	}

	ctrl.log.Info("✅ [API Gateway] Business service UpdateBusiness success",
		zap.String("business_id", business.Business.ID),
		zap.String("business_name", business.Business.Name))

	resp := domain.UpdateBusinessResponse{
		Business: &domain.Business{
			ID:                 business.Business.ID,
			UserID:             business.Business.UserID,
			Name:               business.Business.Name,
			Industry:           business.Business.Industry,
			AudienceReach:      business.Business.AudienceReach,
			Region:             business.Business.Region,
			Description:        business.Business.Description,
			LogoUrl:            business.Business.LogoUrl,
			LogoBase64:         business.Business.LogoBase64,
			CommunicationStyle: business.Business.CommunicationStyle,
			IsActive:           business.Business.IsActive,
			CreatedAt:          business.Business.CreatedAt,
			UpdatedAt:          business.Business.UpdatedAt,
		},
	}

	ctrl.log.Info("✅ [API Gateway] Update business by ID completed successfully",
		zap.String("business_id", business.Business.ID))
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleDeleteBusinessByID(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] DELETE /api/v1/business/delete/:id - Delete business by ID request received")

	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		ctrl.log.Warn("⚠️ [API Gateway] Missing Authorization header in delete business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		ctrl.log.Warn("⚠️ [API Gateway] Invalid Authorization header format in delete business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Authorization header format"})
	}
	token := parts[1]

	id := c.Param("id")
	if id == "" {
		ctrl.log.Error("❌ [API Gateway] Missing business id in path")
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing business id"})
	}

	ctrl.log.Info("📥 [API Gateway] Delete business request data",
		zap.String("business_id", id),
		zap.String("token_prefix", token[:min(10, len(token))]))

	reqDelete := &models.DeleteBusinessRequest{
		BusinessID:  id,
		AccessToken: token,
	}

	ctrl.log.Info("📤 [API Gateway] Calling business service DeleteBusiness",
		zap.String("business_id", id))

	respDelete, err := ctrl.bus.DeleteBusiness(reqDelete)
	if err != nil {
		st, ok := status.FromError(err)
		if ok && st.Code() == codes.NotFound {
			ctrl.log.Warn("⚠️ [API Gateway] Business not found for deletion",
				zap.String("business_id", id))
			return c.JSON(http.StatusNotFound, map[string]string{"error": "business not found"})
		}
		ctrl.log.Error("❌ [API Gateway] Failed to delete business",
			zap.String("business_id", id),
			zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to delete business"})
	}

	ctrl.log.Info("✅ [API Gateway] Business service DeleteBusiness success",
		zap.String("business_id", id),
		zap.Bool("success", respDelete.Success))

	resp := domain.DeleteBussinessResponse{
		Success: respDelete.Success,
	}

	ctrl.log.Info("✅ [API Gateway] Delete business by ID completed successfully",
		zap.String("business_id", id))
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleListBusinesses(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] GET /api/v1/business - List businesses request received")

	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		ctrl.log.Warn("⚠️ [API Gateway] Missing Authorization header in list businesses request")
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		ctrl.log.Warn("⚠️ [API Gateway] Invalid Authorization header format in list businesses request")
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Authorization header format"})
	}
	token := parts[1]

	ctrl.log.Info("📥 [API Gateway] List businesses request data",
		zap.String("token_prefix", token[:min(10, len(token))]))

	req := &models.ListBusinessesRequest{
		AccessToken: token,
	}

	ctrl.log.Info("📤 [API Gateway] Calling business service ListBusinesses")

	respList, err := ctrl.bus.ListBusinesses(req)
	if err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to list businesses", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to list businesses"})
	}

	ctrl.log.Info("✅ [API Gateway] Business service ListBusinesses success",
		zap.Int("businesses_count", len(respList.Businesses)))

	businesses := make([]domain.Business, 0, len(respList.Businesses))
	for _, b := range respList.Businesses {
		businesses = append(businesses, domain.Business{
			ID:                 b.ID,
			UserID:             b.UserID,
			Name:               b.Name,
			Industry:           b.Industry,
			AudienceReach:      b.AudienceReach,
			Region:             b.Region,
			Description:        b.Description,
			LogoUrl:            b.LogoUrl,
			LogoBase64:         b.LogoBase64,
			CommunicationStyle: b.CommunicationStyle,
			IsActive:           b.IsActive,
			CreatedAt:          b.CreatedAt,
			UpdatedAt:          b.UpdatedAt,
		})
	}

	resp := &domain.ListBusinessesResponse{
		Businesses: businesses,
	}

	ctrl.log.Info("✅ [API Gateway] List businesses completed successfully",
		zap.Int("total_businesses", len(businesses)))
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleSetActiveBusiness(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] PUT /api/v1/business/set/:id - Set active business request received")

	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		ctrl.log.Warn("⚠️ [API Gateway] Missing Authorization header in set active business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		ctrl.log.Warn("⚠️ [API Gateway] Invalid Authorization header format in set active business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Authorization header format"})
	}
	token := parts[1]

	id := c.Param("id")
	if id == "" {
		ctrl.log.Error("❌ [API Gateway] Missing business id in path")
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing business id"})
	}

	ctrl.log.Info("📥 [API Gateway] Set active business request data",
		zap.String("business_id", id),
		zap.String("token_prefix", token[:min(10, len(token))]))

	req := &models.SetActiveBusinessRequest{
		BusinessID:  id,
		AccessToken: token,
	}

	ctrl.log.Info("📤 [API Gateway] Calling business service SetActiveBusiness",
		zap.String("business_id", id))

	respGrpc, err := ctrl.bus.SetActiveBusiness(req)
	if err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to set active business",
			zap.String("business_id", id),
			zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to set active business"})
	}

	ctrl.log.Info("✅ [API Gateway] Business service SetActiveBusiness success",
		zap.String("business_id", id),
		zap.Bool("success", respGrpc.Success))

	resp := domain.SetActiveBusinessResponse{
		Success: respGrpc.Success,
	}

	if respGrpc.Business != nil {
		resp.Business = &domain.Business{
			ID:                 respGrpc.Business.ID,
			UserID:             respGrpc.Business.UserID,
			Name:               respGrpc.Business.Name,
			Industry:           respGrpc.Business.Industry,
			AudienceReach:      respGrpc.Business.AudienceReach,
			Region:             respGrpc.Business.Region,
			Description:        respGrpc.Business.Description,
			LogoUrl:            respGrpc.Business.LogoUrl,
			LogoBase64:         respGrpc.Business.LogoBase64,
			CommunicationStyle: respGrpc.Business.CommunicationStyle,
			IsActive:           respGrpc.Business.IsActive,
			CreatedAt:          respGrpc.Business.CreatedAt,
			UpdatedAt:          respGrpc.Business.UpdatedAt,
		}
	}

	ctrl.log.Info("✅ [API Gateway] Set active business completed successfully",
		zap.String("business_id", id))
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleGetActiveBusiness(c echo.Context) error {
	ctrl.log.Info("🔵 [API Gateway] GET /api/v1/business/active - Get active business request received")

	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		ctrl.log.Warn("⚠️ [API Gateway] Missing Authorization header in get active business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		ctrl.log.Warn("⚠️ [API Gateway] Invalid Authorization header format in get active business request")
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Authorization header format"})
	}
	token := parts[1]

	ctrl.log.Info("📥 [API Gateway] Get active business request data",
		zap.String("token_prefix", token[:min(10, len(token))]))

	req := &models.GetActiveBusinessRequest{
		AccessToken: token,
	}

	ctrl.log.Info("📤 [API Gateway] Calling business service GetActiveBusiness")

	respGrpc, err := ctrl.bus.GetActiveBusiness(req)
	if err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to get active business", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to get active business"})
	}

	if respGrpc.Business != nil {
		ctrl.log.Info("✅ [API Gateway] Business service GetActiveBusiness success",
			zap.String("business_id", respGrpc.Business.ID),
			zap.String("business_name", respGrpc.Business.Name))
	} else {
		ctrl.log.Info("✅ [API Gateway] Business service GetActiveBusiness success - no active business")
	}

	resp := &domain.GetActiveBusinessRespose{}

	if respGrpc.Business != nil {
		resp.Business = &domain.Business{
			ID:                 respGrpc.Business.ID,
			UserID:             respGrpc.Business.UserID,
			Name:               respGrpc.Business.Name,
			Industry:           respGrpc.Business.Industry,
			AudienceReach:      respGrpc.Business.AudienceReach,
			Region:             respGrpc.Business.Region,
			Description:        respGrpc.Business.Description,
			LogoUrl:            respGrpc.Business.LogoUrl,
			LogoBase64:         respGrpc.Business.LogoBase64,
			CommunicationStyle: respGrpc.Business.CommunicationStyle,
			IsActive:           respGrpc.Business.IsActive,
			CreatedAt:          respGrpc.Business.CreatedAt,
			UpdatedAt:          respGrpc.Business.UpdatedAt,
		}
	}

	ctrl.log.Info("✅ [API Gateway] Get active business completed successfully")
	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleAnalyzeTelegramChannel(c echo.Context) error {
	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Authorization header format"})
	}
	token := parts[1]

	channelUsername := c.QueryParam("channel_username")
	if channelUsername == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing channel_username query param"})
	}

	startDateStr := c.QueryParam("start_date")
	endDateStr := c.QueryParam("end_date")
	if startDateStr == "" || endDateStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing start_date or end_date query param"})
	}

	startDate, err := strconv.ParseInt(startDateStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid start_date"})
	}

	endDate, err := strconv.ParseInt(endDateStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid end_date"})
	}

	reqGrpc := &models.AnalyzeTelegramChannelRequest{
		ChannelUsername: channelUsername,
		StartDate:       startDate,
		EndDate:         endDate,
		AccessToken:     token,
	}

	respGrpc, err := ctrl.content.AnalyzeTelegramChannel(reqGrpc)
	if err != nil {
		ctrl.log.Error("failed to analyze telegram channel", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to analyze telegram channel"})
	}

	posts := []*domain.TelegramPost{}
	for _, p := range respGrpc.PopularPosts {
		posts = append(posts, &domain.TelegramPost{
			MessageID: p.MessageID,
			Text:      p.Text,
			Views:     p.Views,
			Date:      p.Date,
		})
	}

	resp := domain.AnalyzeTelegramChannelResponse{
		TelegramPost: posts,
	}

	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleGeneratePostFromTelegramPosts(c echo.Context) error {
	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Authorization header format"})
	}
	token := parts[1]

	businessID := c.Param("id")
	if businessID == "" {
		ctrl.log.Error("missing business id in path")
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing business id"})
	}

	var reqBody domain.GeneratePostFromTelegramPostsRequest
	if err := c.Bind(&reqBody); err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to bind generate post from telegram request", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request payload"})
	}

	ctrl.log.Info("📥 [API Gateway] Generate post from Telegram posts request",
		zap.String("business_id", businessID),
		zap.Int("selected_posts_count", len(reqBody.SelectedPost)))

	if len(reqBody.SelectedPost) == 0 {
		ctrl.log.Warn("⚠️ [API Gateway] No selected posts in request")
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "no selected posts"})
	}

	businessReq := &models.GetBusinessRequest{
		BusinessID:  businessID,
		AccessToken: token,
	}
	business, err := ctrl.bus.GetBusiness(businessReq)
	if err != nil {
		st, ok := status.FromError(err)
		if ok {
			switch st.Code() {
			case codes.NotFound:
				return c.JSON(http.StatusNotFound, map[string]string{"error": st.Message()})
			case codes.Unauthenticated:
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": st.Message()})
			case codes.PermissionDenied:
				return c.JSON(http.StatusForbidden, map[string]string{"error": st.Message()})
			case codes.Internal:
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal server error"})
			default:
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "unexpected error"})
			}
		} else {
			ctrl.log.Error("unknown error from business service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		}
	}

	selectedPostsGrpc := make([]*models.SelectedPost, 0, len(reqBody.SelectedPost))
	for _, p := range reqBody.SelectedPost {
		selectedPostsGrpc = append(selectedPostsGrpc, &models.SelectedPost{
			MessageID: p.MessageID,
			Text:      p.Text,
			Views:     p.Views,
		})
	}

	grpcReq := &models.GeneratePostFromTelegramPostsRequest{
		SelectedPosts: selectedPostsGrpc,
		BusinessInfo: &models.BusinessInfo{
			ID:                 business.Business.ID,
			Name:               business.Business.Name,
			Industry:           business.Business.Industry,
			Description:        business.Business.Description,
			CommunicationStyle: business.Business.CommunicationStyle,
			AudienceReach:      &business.Business.AudienceReach,
			Region:             &business.Business.Region,
		},
		AccessToken: token,
	}

	ctrl.log.Info("📤 [API Gateway] Calling content service GeneratePostFromTelegramPosts",
		zap.String("business_id", businessID),
		zap.Int("posts_count", len(grpcReq.SelectedPosts)))

	grpcResp, err := ctrl.content.GeneratePostFromTelegramPosts(grpcReq)
	if err != nil {
		ctrl.log.Error("❌ [API Gateway] Failed to generate post from Telegram posts",
			zap.String("business_id", businessID),
			zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to generate post"})
	}

	ctrl.log.Info("✅ [API Gateway] Post generated successfully",
		zap.String("business_id", businessID),
		zap.Int("generated_post_length", len(grpcResp.GeneratedPost)))

	resp := domain.GeneratePostFromTelegramPostsResponse{
		GeneratedPost: grpcResp.GeneratedPost,
		Message:       grpcResp.Message,
	}

	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleGenerateBusinessPost(c echo.Context) error {
	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Authorization header format"})
	}
	token := parts[1]

	businessID := c.Param("id")
	if businessID == "" {
		ctrl.log.Error("missing business id in path")
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing business id"})
	}

	var reqBody domain.GenerateBusinessPostRequest
	if err := c.Bind(&reqBody); err != nil {
		ctrl.log.Error("failed to bind request body", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request payload"})
	}

	businessReq := &models.GetBusinessRequest{
		BusinessID:  businessID,
		AccessToken: token,
	}
	business, err := ctrl.bus.GetBusiness(businessReq)
	if err != nil {
		st, ok := status.FromError(err)
		if ok {
			switch st.Code() {
			case codes.NotFound:
				return c.JSON(http.StatusNotFound, map[string]string{"error": st.Message()})
			case codes.Unauthenticated:
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": st.Message()})
			case codes.PermissionDenied:
				return c.JSON(http.StatusForbidden, map[string]string{"error": st.Message()})
			case codes.Internal:
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal server error"})
			default:
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "unexpected error"})
			}
		} else {
			ctrl.log.Error("unknown error from business service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		}
	}

	grpcReq := &models.GenerateBusinessPostRequest{
		Description: reqBody.Description,
		Goal:        models.PostGoal(reqBody.Goal),
		Tone:        &reqBody.Tone,
		AccessToken: token,
		BusinessInfo: &models.BusinessInfo{
			ID:                 business.Business.ID,
			Name:               business.Business.Name,
			Industry:           business.Business.Industry,
			Description:        business.Business.Description,
			CommunicationStyle: business.Business.CommunicationStyle,
			AudienceReach:      &business.Business.AudienceReach,
			Region:             &business.Business.Region,
		},
	}

	grpcResp, err := ctrl.content.GenerateBusinessPost(grpcReq)
	if err != nil {
		ctrl.log.Error("failed to generate business post", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to generate business post"})
	}

	resp := domain.GenerateBusinessPostResponse{
		GeneratedPost: grpcResp.GeneratedPost,
		Message:       grpcResp.Message,
	}

	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleGenerateContentPlan(c echo.Context) error {
	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Authorization header format"})
	}
	token := parts[1]

	businessID := c.Param("id")
	if businessID == "" {
		ctrl.log.Error("missing business id in path")
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing business id"})
	}

	var reqBody domain.GenerateContentPlanRequest
	if err := c.Bind(&reqBody); err != nil {
		ctrl.log.Error("failed to bind request body", zap.Error(err))
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request payload"})
	}

	businessReq := &models.GetBusinessRequest{
		BusinessID:  businessID,
		AccessToken: token,
	}

	business, err := ctrl.bus.GetBusiness(businessReq)
	if err != nil {
		st, ok := status.FromError(err)
		if ok {
			switch st.Code() {
			case codes.NotFound:
				return c.JSON(http.StatusNotFound, map[string]string{"error": st.Message()})
			case codes.Unauthenticated:
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": st.Message()})
			case codes.PermissionDenied:
				return c.JSON(http.StatusForbidden, map[string]string{"error": st.Message()})
			case codes.Internal:
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal server error"})
			default:
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "unexpected error"})
			}
		} else {
			ctrl.log.Error("unknown error from business service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		}
	}

	grpcReq := &models.GenerateContentPlanRequest{
		BusinessInfo: &models.BusinessInfo{
			ID:                 business.Business.ID,
			Name:               business.Business.Name,
			Industry:           business.Business.Industry,
			Description:        business.Business.Description,
			CommunicationStyle: business.Business.CommunicationStyle,
			AudienceReach:      &business.Business.AudienceReach,
			Region:             &business.Business.Region,
		},
		Goal:        models.PostGoal(reqBody.Goal),
		TotalPosts:  reqBody.TotalPosts,
		PeriodDays:  reqBody.PeriodDays,
		Description: &reqBody.Description,
		AccessToken: token,
	}
	grpcResp, err := ctrl.content.GenerateContentPlan(grpcReq)
	if err != nil {
		ctrl.log.Error("failed to generate content plan", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to generate content plan"})
	}

	resp := domain.GenerateContentPlanResponse{
		ContentPlanItem: make([]*domain.ContentPlanItem, len(grpcResp.Items)),
		Message:         grpcResp.Message,
		PlanID:          grpcResp.PlanId,
	}

	for i, item := range grpcResp.Items {
		plannedDate := int64(0)
		if item.PlannedDate != nil {
			plannedDate = *item.PlannedDate
		}
		resp.ContentPlanItem[i] = &domain.ContentPlanItem{
			Title:       item.Title,
			Idea:        item.Idea,
			Format:      item.Format,
			Goal:        int32(item.Goal),
			PlannedDate: plannedDate,
		}
	}

	return c.JSON(http.StatusOK, resp)
}

func (ctrl *Controller) handleGetContentPlan(c echo.Context) error {
	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Authorization header format"})
	}
	token := parts[1]

	businessID := c.Param("id")
	if businessID == "" {
		ctrl.log.Error("missing business id in path")
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing business id"})
	}

	reqGrpc := &models.GetContentPlanRequest{
		PlanID:      businessID,
		AccessToken: token,
	}

	respGrpc, err := ctrl.content.GetContentPlan(reqGrpc)
	if err != nil {
		st, ok := status.FromError(err)
		if ok {
			switch st.Code() {
			case codes.NotFound:
				return c.JSON(http.StatusNotFound, map[string]string{"error": st.Message()})
			case codes.Unauthenticated:
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": st.Message()})
			case codes.PermissionDenied:
				return c.JSON(http.StatusForbidden, map[string]string{"error": st.Message()})
			case codes.Internal:
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal server error"})
			default:
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "unexpected error"})
			}
		} else {
			ctrl.log.Error("unknown error from content service", zap.Error(err))
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		}
	}

	resp := domain.GetContentPlanResponse{
		PlanID:          respGrpc.PlanId,
		UserID:          respGrpc.UserId,
		BussinesID:      "",
		Goal:            int32(respGrpc.Goal),
		TotalPosts:      respGrpc.TotalPosts,
		PeriodDays:      respGrpc.PeriodDays,
		Description:     "",
		ContentPlanItem: make([]*domain.ContentPlanItem, len(respGrpc.Items)),
		CreatedAt:       respGrpc.CreatedAt,
		UpdatedAt:       "",
		Message:         respGrpc.Message,
	}

	if respGrpc.BusinessId != nil {
		resp.BussinesID = *respGrpc.BusinessId
	}
	if respGrpc.Description != nil {
		resp.Description = *respGrpc.Description
	}
	if respGrpc.UpdatedAt != nil {
		resp.UpdatedAt = strconv.FormatInt(*respGrpc.UpdatedAt, 10)
	}

	for i, item := range respGrpc.Items {
		plannedDate := int64(0)
		if item.PlannedDate != nil {
			plannedDate = *item.PlannedDate
		}
		resp.ContentPlanItem[i] = &domain.ContentPlanItem{
			Title:       item.Title,
			Idea:        item.Idea,
			Format:      item.Format,
			Goal:        int32(item.Goal),
			PlannedDate: plannedDate,
		}
	}

	return c.JSON(http.StatusOK, resp)
}
