package models

type BusinessCreateRequest struct {
	AccessToken        string
	Name               string
	Industry           string
	AudienceReach      string
	Region             string
	Description        string
	LogoBytes          []byte
	CommunicationStyle string
}

type BusinessCreateResponse struct {
	Business *Business
}
type Business struct {
	ID                 string
	UserID             string
	Name               string
	Industry           string
	AudienceReach      string
	Region             string
	Description        string
	LogoUrl            string
	LogoBase64         string
	CommunicationStyle string
	IsActive           bool
	CreatedAt          int64
	UpdatedAt          int64
}

type GetBusinessRequest struct {
	BusinessID  string
	AccessToken string
}

type GetBusinessResponse struct {
	Business *Business
}

type UpdateBusinessRequest struct {
	BusinessId         string
	Name               *string
	Industry           *string
	AudienceReach      *string
	Region             *string
	Description        *string
	LogoBytes          []byte
	CommunicationStyle *string
	AccessToken        string
}

type UpdateBusinessResponse struct {
	Business *Business
}

type DeleteBusinessRequest struct {
	BusinessID  string
	AccessToken string
}

type DeleteBusinessResponse struct {
	Success bool
}

type ListBusinessesRequest struct {
	AccessToken string
}

type ListBusinessesResponse struct {
	Businesses []*Business
}

type SetActiveBusinessRequest struct {
	BusinessID  string
	AccessToken string
}

type SetActiveBusinessResponse struct {
	Success  bool
	Business *Business
}

type GetActiveBusinessRequest struct {
	AccessToken string
}

type GetActiveBusinessResponse struct {
	Business *Business
}
