package business

import (
	"context"
	businessv1 "pp2/gen/business/v1"
	"pp2/internal/config"
	"pp2/internal/models"
	"strconv"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type BusinessClient interface {
	CreateBusiness(req *models.BusinessCreateRequest) (*models.BusinessCreateResponse, error)
	GetBusiness(req *models.GetBusinessRequest) (*models.GetBusinessResponse, error)
	UpdateBusiness(req *models.UpdateBusinessRequest) (*models.UpdateBusinessResponse, error)
	DeleteBusiness(req *models.DeleteBusinessRequest) (*models.DeleteBusinessResponse, error)
	ListBusinesses(req *models.ListBusinessesRequest) (*models.ListBusinessesResponse, error)
	SetActiveBusiness(req *models.SetActiveBusinessRequest) (*models.SetActiveBusinessResponse, error)
	GetActiveBusiness(req *models.GetActiveBusinessRequest) (*models.GetActiveBusinessResponse, error)
}

type Client struct {
	log *zap.Logger
	cfg *config.Config
	ctx context.Context
	api businessv1.BusinessServiceClient
}

func NewBusinessClient(log *zap.Logger, cfg *config.Config, ctx context.Context) (BusinessClient, error) {
	address := cfg.Business.Host + ":" + strconv.Itoa(cfg.Business.Port)

	clientConn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to business service", zap.Error(err))
		return nil, err
	}
	api := businessv1.NewBusinessServiceClient(clientConn)
	return &Client{
		log: log,
		cfg: cfg,
		ctx: ctx,
		api: api,
	}, nil
}

func (c *Client) CreateBusiness(req *models.BusinessCreateRequest) (*models.BusinessCreateResponse, error) {
	regGrpc := &businessv1.CreateBusinessRequest{
		AccessToken:        req.AccessToken,
		Name:               req.Name,
		Industry:           req.Industry,
		AudienceReach:      req.AudienceReach,
		Region:             req.Region,
		Description:        req.Description,
		LogoBytes:          req.LogoBytes,
		CommunicationStyle: req.CommunicationStyle,
	}
	resp, err := c.api.CreateBusiness(c.ctx, regGrpc)
	if err != nil {
		return nil, err
	}
	return &models.BusinessCreateResponse{
		Business: &models.Business{
			ID:                 resp.Business.Id,
			UserID:             resp.Business.UserId,
			Name:               resp.Business.Name,
			Industry:           resp.Business.Industry,
			AudienceReach:      resp.Business.AudienceReach,
			Region:             resp.Business.Region,
			Description:        resp.Business.Description,
			LogoUrl:            resp.Business.LogoUrl,
			LogoBase64:         resp.Business.LogoBase64,
			CommunicationStyle: resp.Business.CommunicationStyle,
			IsActive:           resp.Business.IsActive,
			CreatedAt:          resp.Business.CreatedAt,
			UpdatedAt:          resp.Business.UpdatedAt,
		},
	}, nil
}

func (c *Client) GetBusiness(req *models.GetBusinessRequest) (*models.GetBusinessResponse, error) {
	getGrpc := &businessv1.GetBusinessRequest{
		BusinessId:  req.BusinessID,
		AccessToken: req.AccessToken,
	}
	resp, err := c.api.GetBusiness(c.ctx, getGrpc)
	if err != nil {
		return nil, err
	}
	return &models.GetBusinessResponse{
		Business: &models.Business{
			ID:                 resp.Business.Id,
			UserID:             resp.Business.UserId,
			Name:               resp.Business.Name,
			Industry:           resp.Business.Industry,
			AudienceReach:      resp.Business.AudienceReach,
			Region:             resp.Business.Region,
			Description:        resp.Business.Description,
			LogoUrl:            resp.Business.LogoUrl,
			LogoBase64:         resp.Business.LogoBase64,
			CommunicationStyle: resp.Business.CommunicationStyle,
			IsActive:           resp.Business.IsActive,
			CreatedAt:          resp.Business.CreatedAt,
			UpdatedAt:          resp.Business.UpdatedAt,
		},
	}, nil
}

func (c *Client) UpdateBusiness(req *models.UpdateBusinessRequest) (*models.UpdateBusinessResponse, error) {

	grpcReq := &businessv1.UpdateBusinessRequest{
		BusinessId:  req.BusinessId,
		AccessToken: req.AccessToken,
	}

	// Устанавливаем опциональные поля только если они не nil
	if req.Name != nil {
		grpcReq.Name = req.Name
	}
	if req.Industry != nil {
		grpcReq.Industry = req.Industry
	}
	if req.AudienceReach != nil {
		grpcReq.AudienceReach = req.AudienceReach
	}
	if req.Region != nil {
		grpcReq.Region = req.Region
	}
	if req.Description != nil {
		grpcReq.Description = req.Description
	}
	if req.LogoBytes != nil && len(req.LogoBytes) > 0 {
		grpcReq.LogoBytes = req.LogoBytes
	}
	if req.CommunicationStyle != nil {
		grpcReq.CommunicationStyle = req.CommunicationStyle
	}

	respGrpc, err := c.api.UpdateBusiness(c.ctx, grpcReq)
	if err != nil {
		return nil, err
	}

	resp := &models.UpdateBusinessResponse{
		Business: &models.Business{
			ID:                 respGrpc.Business.Id,
			UserID:             respGrpc.Business.UserId,
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
		},
	}

	return resp, nil
}

func (c *Client) DeleteBusiness(req *models.DeleteBusinessRequest) (*models.DeleteBusinessResponse, error) {
	deleteGrpc := &businessv1.DeleteBusinessRequest{
		BusinessId:  req.BusinessID,
		AccessToken: req.AccessToken,
	}
	resp, err := c.api.DeleteBusiness(c.ctx, deleteGrpc)
	if err != nil {
		return nil, err
	}
	return &models.DeleteBusinessResponse{
		Success: resp.Success,
	}, nil
}

func (c *Client) ListBusinesses(req *models.ListBusinessesRequest) (*models.ListBusinessesResponse, error) {
	listGrpc := &businessv1.ListBusinessesRequest{
		AccessToken: req.AccessToken,
	}
	resp, err := c.api.ListBusinesses(c.ctx, listGrpc)
	if err != nil {
		return nil, err
	}
	businesses := []*models.Business{}
	for _, b := range resp.Businesses {
		businesses = append(businesses, &models.Business{
			ID:                 b.Id,
			UserID:             b.UserId,
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
	return &models.ListBusinessesResponse{
		Businesses: businesses,
	}, nil
}

func (c *Client) SetActiveBusiness(req *models.SetActiveBusinessRequest) (*models.SetActiveBusinessResponse, error) {
	setGrpc := &businessv1.SetActiveBusinessRequest{
		BusinessId:  req.BusinessID,
		AccessToken: req.AccessToken,
	}

	resp, err := c.api.SetActiveBusiness(c.ctx, setGrpc)
	if err != nil {
		return nil, err
	}

	return &models.SetActiveBusinessResponse{
		Success: resp.Success,
		Business: &models.Business{
			ID:                 resp.Business.Id,
			UserID:             resp.Business.UserId,
			Name:               resp.Business.Name,
			Industry:           resp.Business.Industry,
			AudienceReach:      resp.Business.AudienceReach,
			Region:             resp.Business.Region,
			Description:        resp.Business.Description,
			LogoUrl:            resp.Business.LogoUrl,
			LogoBase64:         resp.Business.LogoBase64,
			CommunicationStyle: resp.Business.CommunicationStyle,
			IsActive:           resp.Business.IsActive,
			CreatedAt:          resp.Business.CreatedAt,
			UpdatedAt:          resp.Business.UpdatedAt,
		},
	}, nil

}

func (c *Client) GetActiveBusiness(req *models.GetActiveBusinessRequest) (*models.GetActiveBusinessResponse, error) {
	getGrpc := businessv1.GetActiveBusinessRequest{
		AccessToken: req.AccessToken,
	}

	resp, err := c.api.GetActiveBusiness(c.ctx, &getGrpc)
	if err != nil {
		return nil, err
	}

	return &models.GetActiveBusinessResponse{
		Business: &models.Business{
			ID:                 resp.Business.Id,
			UserID:             resp.Business.UserId,
			Name:               resp.Business.Name,
			Industry:           resp.Business.Industry,
			AudienceReach:      resp.Business.AudienceReach,
			Region:             resp.Business.Region,
			Description:        resp.Business.Description,
			LogoUrl:            resp.Business.LogoUrl,
			LogoBase64:         resp.Business.LogoBase64,
			CommunicationStyle: resp.Business.CommunicationStyle,
			IsActive:           resp.Business.IsActive,
			CreatedAt:          resp.Business.CreatedAt,
			UpdatedAt:          resp.Business.UpdatedAt,
		},
	}, nil
}
