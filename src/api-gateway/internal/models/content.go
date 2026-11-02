package models

type AnalyzeTelegramChannelRequest struct {
	ChannelUsername string
	StartDate       int64
	EndDate         int64
	AccessToken     string
}

type AnalyzeTelegramChannelResponse struct {
	PopularPosts []*TelegramPost
	Message      string
}

type TelegramPost struct {
	MessageID int32
	Text      string
	Views     int32
	Date      int64
}

type GeneratePostFromTelegramPostsRequest struct {
	SelectedPosts []*SelectedPost
	BusinessInfo  *BusinessInfo
	AccessToken   string
}

type SelectedPost struct {
	MessageID int32
	Text      string
	Views     int32
}

type BusinessInfo struct {
	ID                 string
	Name               string
	Industry           string
	Description        string
	CommunicationStyle string
	AudienceReach      *string
	Region             *string
}

type GeneratePostFromTelegramPostsResponse struct {
	GeneratedPost string
	Message       string
}

type GenerateBusinessPostRequest struct {
	Description  string
	Goal         PostGoal
	Tone         *string
	BusinessInfo *BusinessInfo
	AccessToken  string
}

type PostGoal int32

type GenerateBusinessPostResponse struct {
	GeneratedPost string
	Message       string
}

type GenerateContentPlanRequest struct {
	BusinessInfo *BusinessInfo
	Goal         PostGoal
	TotalPosts   int32
	PeriodDays   int32
	Description  *string
	AccessToken  string
}

type GenerateContentPlanResponse struct {
	Items   []*ContentPlanItem
	Message string
	PlanId  string
}

type ContentPlanItem struct {
	Title       string
	Idea        string
	Format      string
	Goal        PostGoal
	PlannedDate *int64
}

type GetContentPlanRequest struct {
	PlanID      string
	AccessToken string
}

type GetContentPlanResponse struct {
	PlanId      string
	UserId      string
	BusinessId  *string
	Goal        PostGoal
	TotalPosts  int32
	PeriodDays  int32
	Description *string
	Items       []*ContentPlanItem
	CreatedAt   int64
	UpdatedAt   *int64
	Message     string
}
