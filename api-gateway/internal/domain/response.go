package domain

type RegisterUserResponse struct {
	Confirmed         bool   `json:"confirmed"`
	EmailConfirmToken string `json:"email_confirm_token"`
	EmailMessage      string `json:"email_message"`
	UserMessage       string `json:"user_message"`
}

type ConfirmVerifyCodeResponse struct {
	Confirmed    bool   `json:"confirmed"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	Message      string `json:"user_message"`
}

type LoginUserResponse struct {
	Confirmed         bool   `json:"confirmed"`
	AccessToken       string `json:"access_token"`
	RefreshToken      string `json:"refresh_token"`
	EmailConfirmToken string `json:"email_confirm_token"`
	Message           string `json:"user_message"`
}

type RefreshUserTokenResponse struct {
	Message     string `json:"user_message"`
	AccessToken string `json:"access_token"`
}

type SendPasswordResetCodeResponse struct {
	Message        string `json:"user_message"`
	ResetPassToken string `json:"reset_pass_token"`
}

type ConfirmPasswordResetCodeResponse struct {
	Confirmed bool   `json:"confirmed"`
	Message   string `json:"user_message"`
}

type ResetPasswordResponse struct {
	Success bool   `json:"success"`
	Message string `json:"user_message"`
}

type CreateBusinessResponse struct {
	Business *Business `json:"business"`
}

type Business struct {
	ID                 string `json:"id"`
	UserID             string `json:"user_id"`
	Name               string `json:"name"`
	Industry           string `json:"industry"`
	AudienceReach      string `json:"audience_reach"`
	Region             string `json:"region"`
	Description        string `json:"decriprion"`
	LogoUrl            string `json:"logo_url"`
	LogoBase64         string `json:"logo_base64"`
	CommunicationStyle string `json:"communication_style"`
	IsActive           bool   `json:"is_active"`
	CreatedAt          int64  `json:"created_at"`
	UpdatedAt          int64  `json:"update_at"`
}

type GetBusinessResponse struct {
	Business *Business `json:"business"`
}

type UpdateBusinessResponse struct {
	Business *Business `json:"business"`
}

type DeleteBussinessResponse struct {
	Success bool `json:"success"`
}

type ListBusinessesResponse struct {
	Businesses []Business `json:"businesses"`
}

type SetActiveBusinessResponse struct {
	Success  bool      `json:"success"`
	Business *Business `json:"business"`
}

type GetActiveBusinessRespose struct {
	Business *Business `json:"business"`
}

type AnalyzeTelegramChannelResponse struct {
	TelegramPost []*TelegramPost `json:"telegram_post"`
}

type TelegramPost struct {
	MessageID int32  `json:"message_id"`
	Text      string `json:"text"`
	Views     int32  `json:"views"`
	Date      int64  `json:"date"`
}

type GeneratePostFromTelegramPostsResponse struct {
	GeneratedPost string `json:"generated_post"`
	Message       string `json:"message"`
}

type GenerateBusinessPostResponse struct {
	GeneratedPost string `json:"generated_post"`
	Message       string `json:"message"`
}

type GenerateContentPlanResponse struct {
	ContentPlanItem []*ContentPlanItem `json:"content_plan_item"`
	Message         string             `json:"message"`
	PlanID          string             `json:"plan_id"`
}

type ContentPlanItem struct {
	Title       string `json:"title"`
	Idea        string `json:"idea"`
	Format      string `json:"format"`
	Goal        int32  `json:"goal"`
	PlannedDate int64  `json:"planned_date"`
}

type GetContentPlanResponse struct {
	PlanID          string             `json:"plan_id"`
	UserID          string             `json:"user_id"`
	BussinesID      string             `json:"bussines_id"`
	Goal            int32              `json:"goal"`
	TotalPosts      int32              `json:"total_posts"`
	PeriodDays      int32              `json:"period_days"`
	Description     string             `json:"desctiption"`
	ContentPlanItem []*ContentPlanItem `json:"content_plan_item"`
	CreatedAt       int64              `json:"created_at"`
	UpdatedAt       string             `json:"updated_at"`
	Message         string             `json:"message"`
}
