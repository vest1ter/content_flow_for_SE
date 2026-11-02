package content

import (
	"context"
	contentv1 "pp2/gen/content/v1"
	"pp2/internal/config"
	"pp2/internal/models"
	"strconv"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type ContentClient interface {
	AnalyzeTelegramChannel(req *models.AnalyzeTelegramChannelRequest) (*models.AnalyzeTelegramChannelResponse, error)
	GeneratePostFromTelegramPosts(req *models.GeneratePostFromTelegramPostsRequest) (*models.GeneratePostFromTelegramPostsResponse, error)
	GenerateBusinessPost(req *models.GenerateBusinessPostRequest) (*models.GenerateBusinessPostResponse, error)
	GenerateContentPlan(req *models.GenerateContentPlanRequest) (*models.GenerateContentPlanResponse, error)
	GetContentPlan(req *models.GetContentPlanRequest) (*models.GetContentPlanResponse, error)
}

type Client struct {
	log *zap.Logger
	cfg *config.Config
	ctx context.Context
	api contentv1.ContentServiceClient
}

func NewContentClient(log *zap.Logger, cfg *config.Config, ctx context.Context) (ContentClient, error) {
	address := cfg.Content.Host + ":" + strconv.Itoa(cfg.Content.Port)

	clientConn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to business service", zap.Error(err))
		return nil, err
	}
	api := contentv1.NewContentServiceClient(clientConn)
	return &Client{
		log: log,
		cfg: cfg,
		ctx: ctx,
		api: api,
	}, nil
}

func (c *Client) AnalyzeTelegramChannel(req *models.AnalyzeTelegramChannelRequest) (*models.AnalyzeTelegramChannelResponse, error) {
	analyzeGrpc := &contentv1.AnalyzeTelegramChannelRequest{
		ChannelUsername: req.ChannelUsername,
		StartDate:       req.StartDate,
		EndDate:         req.EndDate,
		AccessToken:     req.AccessToken,
	}

	resp, err := c.api.AnalyzeTelegramChannel(c.ctx, analyzeGrpc)
	if err != nil {
		return nil, err
	}

	posts := []*models.TelegramPost{}

	for _, p := range resp.PopularPosts {
		post := &models.TelegramPost{
			MessageID: p.MessageId,
			Text:      p.Text,
			Views:     p.Views,
			Date:      p.Date,
		}
		posts = append(posts, post)
	}

	return &models.AnalyzeTelegramChannelResponse{
		PopularPosts: posts,
		Message:      resp.Message,
	}, nil
}

func (c *Client) GeneratePostFromTelegramPosts(req *models.GeneratePostFromTelegramPostsRequest) (*models.GeneratePostFromTelegramPostsResponse, error) {

	genGrpc := &contentv1.GeneratePostFromTelegramPostsRequest{
		SelectedPosts: make([]*contentv1.SelectedPost, len(req.SelectedPosts)),
		BusinessInfo: &contentv1.BusinessInfo{
			Id:                 req.BusinessInfo.ID,
			Name:               req.BusinessInfo.Name,
			Industry:           req.BusinessInfo.Industry,
			Description:        req.BusinessInfo.Description,
			CommunicationStyle: req.BusinessInfo.CommunicationStyle,
			AudienceReach:      req.BusinessInfo.AudienceReach,
			Region:             req.BusinessInfo.Region,
		},
		AccessToken: req.AccessToken,
	}

	for i, p := range req.SelectedPosts {
		genGrpc.SelectedPosts[i] = &contentv1.SelectedPost{
			MessageId: p.MessageID,
			Text:      p.Text,
			Views:     p.Views,
		}
	}

	respGrpc, err := c.api.GeneratePostFromTelegramPosts(c.ctx, genGrpc)
	if err != nil {
		return nil, err
	}

	return &models.GeneratePostFromTelegramPostsResponse{
		GeneratedPost: respGrpc.GeneratedPost,
		Message:       respGrpc.Message,
	}, nil
}

func (c *Client) GenerateBusinessPost(req *models.GenerateBusinessPostRequest) (*models.GenerateBusinessPostResponse, error) {

	grpcReq := &contentv1.GenerateBusinessPostRequest{
		Description: req.Description,
		Goal:        contentv1.PostGoal(req.Goal),
		Tone:        req.Tone,
		BusinessInfo: &contentv1.BusinessInfo{
			Id:                 req.BusinessInfo.ID,
			Name:               req.BusinessInfo.Name,
			Industry:           req.BusinessInfo.Industry,
			Description:        req.BusinessInfo.Description,
			CommunicationStyle: req.BusinessInfo.CommunicationStyle,
			AudienceReach:      req.BusinessInfo.AudienceReach,
			Region:             req.BusinessInfo.Region,
		},
		AccessToken: req.AccessToken,
	}

	respGrpc, err := c.api.GenerateBusinessPost(c.ctx, grpcReq)
	if err != nil {
		return nil, err
	}

	return &models.GenerateBusinessPostResponse{
		GeneratedPost: respGrpc.GeneratedPost,
		Message:       respGrpc.Message,
	}, nil
}

func (c *Client) GenerateContentPlan(req *models.GenerateContentPlanRequest) (*models.GenerateContentPlanResponse, error) {
	grpcReq := &contentv1.GenerateContentPlanRequest{
		BusinessInfo: &contentv1.BusinessInfo{
			Id:                 req.BusinessInfo.ID,
			Name:               req.BusinessInfo.Name,
			Industry:           req.BusinessInfo.Industry,
			Description:        req.BusinessInfo.Description,
			CommunicationStyle: req.BusinessInfo.CommunicationStyle,
			AudienceReach:      req.BusinessInfo.AudienceReach,
			Region:             req.BusinessInfo.Region,
		},
		Goal:        contentv1.PostGoal(req.Goal),
		TotalPosts:  req.TotalPosts,
		PeriodDays:  req.PeriodDays,
		Description: req.Description,
		AccessToken: req.AccessToken,
	}

	respGrpc, err := c.api.GenerateContentPlan(c.ctx, grpcReq)
	if err != nil {
		return nil, err
	}

	items := make([]*models.ContentPlanItem, len(respGrpc.Items))
	for i, item := range respGrpc.Items {
		items[i] = &models.ContentPlanItem{
			Title:       item.Title,
			Idea:        item.Idea,
			Format:      item.Format,
			Goal:        models.PostGoal(item.Goal),
			PlannedDate: item.PlannedDate,
		}
	}

	return &models.GenerateContentPlanResponse{
		Items:   items,
		Message: respGrpc.Message,
		PlanId:  respGrpc.PlanId,
	}, nil
}

func (c *Client) GetContentPlan(req *models.GetContentPlanRequest) (*models.GetContentPlanResponse, error) {

	grpcReq := &contentv1.GetContentPlanRequest{
		PlanId:      req.PlanID,
		AccessToken: req.AccessToken,
	}

	respGrpc, err := c.api.GetContentPlan(c.ctx, grpcReq)
	if err != nil {
		return nil, err
	}

	items := make([]*models.ContentPlanItem, len(respGrpc.Items))
	for i, item := range respGrpc.Items {
		items[i] = &models.ContentPlanItem{
			Title:       item.Title,
			Idea:        item.Idea,
			Format:      item.Format,
			Goal:        models.PostGoal(item.Goal),
			PlannedDate: item.PlannedDate,
		}
	}

	var businessID *string
	if respGrpc.BusinessId != nil {
		businessID = respGrpc.BusinessId
	}

	return &models.GetContentPlanResponse{
		PlanId:      respGrpc.PlanId,
		UserId:      respGrpc.UserId,
		BusinessId:  businessID,
		Goal:        models.PostGoal(respGrpc.Goal),
		TotalPosts:  respGrpc.TotalPosts,
		PeriodDays:  respGrpc.PeriodDays,
		Description: respGrpc.Description,
		Items:       items,
		CreatedAt:   respGrpc.CreatedAt,
		UpdatedAt:   respGrpc.UpdatedAt,
		Message:     respGrpc.Message,
	}, nil
}
