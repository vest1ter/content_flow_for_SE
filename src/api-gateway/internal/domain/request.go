package domain

type RegisterUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ConfirmVerifyCodeRequest struct {
	EmailToken string `json:"email_token"`
	Code       int32  `json:"code"`
}

type LoginUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RefreshUserTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type SendPasswordResetCodeRequest struct {
	Email string `json:"email"`
}

type ConfirmPasswordResetCodeRequest struct {
	Code           int32  `json:"code"`
	ResetPassToken string `json:"reset_pass_token"`
}

type ResetPasswordRequest struct {
	ResetPassToken string `json:"reset_pass_token"`
	NewPassword    string `json:"new_password"`
}

type CreateBusinessRequest struct {
	Name               string `json:"name"`
	Industry           string `json:"industry"`
	AudienceReach      string `json:"audience_reach"`
	Region             string `json:"region"`
	Description        string `json:"description"`
	Logo               string `json:"logo"`
	CommunicationStyle string `json:"communication_style"`
}

type UpdateBusinessRequest struct {
	Name               *string `json:"name"`
	Industry           *string `json:"industry"`
	AudienceReach      *string `json:"audience_reach"`
	Region             *string `json:"region"`
	Description        *string `json:"description"`
	Logo               string  `json:"logo"`
	CommunicationStyle *string `json:"communication_style"`
}

type DeleteBusinessRequest struct {
	BussinessID string `json:"business_id"`
	AccessToken string `json:"access_token"`
}

type GeneratePostFromTelegramPostsRequest struct {
	SelectedPost []*SelectedPost `json:"selected_post"`
}

type SelectedPost struct {
	MessageID int32  `json:"message_id"`
	Text      string `json:"text"`
	Views     int32  `json:"views"`
}

type GenerateBusinessPostRequest struct {
	Description string `json:"description"`
	Goal        int32  `json:"goal"`
	Tone        string `json:"tone"`
}

type GenerateContentPlanRequest struct {
	Goal        int32  `json:"goal"`
	TotalPosts  int32  `json:"total_posts"`
	PeriodDays  int32  `json:"period_days"`
	Description string `json:"description"`
}
