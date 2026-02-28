package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/shubhangcs/agromart-server/internal/store"
	"github.com/shubhangcs/agromart-server/internal/utils"
)

type followerRequest struct {
	UserID     string    `json:"user_id"`
	BusinessID string    `json:"business_id"`
	CreatedAT  time.Time `json:"created_at"`
}

type FollowerHandler struct {
	followerStore store.FollowerStore
	logger        *log.Logger
}

func NewFollowerHandler(followerStore store.FollowerStore, logger *log.Logger) *FollowerHandler {
	return &FollowerHandler{
		followerStore: followerStore,
		logger:        logger,
	}
}

func (fh *FollowerHandler) validateCreateAndRemoveFollowerRequest(req *followerRequest) error {
	if req.UserID == "" {
		return errors.New("invalid request user id is required")
	}

	if req.BusinessID == "" {
		return errors.New("invalid request business id is required")
	}

	return nil
}

func (fh *FollowerHandler) HandleCreateFollower(w http.ResponseWriter, r *http.Request) {
	var req followerRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fh.logger.Printf("ERROR: create follower: %v", err)
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": "invalid request payload"})
		return
	}

	err = fh.validateCreateAndRemoveFollowerRequest(&req)
	if err != nil {
		fh.logger.Printf("ERROR: create follower: %v", err)
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": err.Error()})
		return
	}

	follower := &store.Follower{
		UserID:     req.UserID,
		BusinessID: req.BusinessID,
	}

	err = fh.followerStore.CreateFollower(follower)
	if err != nil {
		fh.logger.Printf("ERROR: create follower: %v", err)
		utils.WriteJSON(w, http.StatusInternalServerError, utils.Envelope{"error": "internal server error"})
		return
	}

	utils.WriteJSON(w, http.StatusCreated, utils.Envelope{"message": "follow successful"})
}

func (fh *FollowerHandler) HandleRemoveFollower(w http.ResponseWriter, r *http.Request) {
	var req followerRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fh.logger.Printf("ERROR: remove follower: %v", err)
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": "invalid request payload"})
		return
	}

	err = fh.validateCreateAndRemoveFollowerRequest(&req)
	if err != nil {
		fh.logger.Printf("ERROR: remove follower: %v", err)
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": err.Error()})
		return
	}

	follower := &store.Follower{
		UserID:     req.UserID,
		BusinessID: req.BusinessID,
	}

	err = fh.followerStore.RemoveFollower(follower)
	if err != nil {
		fh.logger.Printf("ERROR: remove follower: %v", err)
		utils.WriteJSON(w, http.StatusInternalServerError, utils.Envelope{"error": "internal server error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, utils.Envelope{"message": "unfollow successful"})
}

func (fh *FollowerHandler) HandleGetFollowersCount(w http.ResponseWriter, r *http.Request) {
	businessId, err := utils.ReadParamID(r)
	if err != nil {
		fh.logger.Printf("ERROR: get follower count: %v", err)
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": err.Error()})
		return
	}

	if businessId == "" {
		fh.logger.Println("ERROR: get follower count: empty business id")
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": "invalid request business id is required"})
		return
	}

	count, err := fh.followerStore.GetFollowersCount(businessId)
	if err != nil {
		fh.logger.Printf("ERROR: get follower count: %v", err)
		utils.WriteJSON(w, http.StatusInternalServerError, utils.Envelope{"error": "internal server error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, utils.Envelope{"message": "follower count fetched successfully", "followers_count": count})
}

func (fh *FollowerHandler) HandleGetFollowingCount(w http.ResponseWriter, r *http.Request) {
	userId, err := utils.ReadParamID(r)
	if err != nil {
		fh.logger.Printf("ERROR: get following count: %v", err)
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": err.Error()})
		return
	}

	if userId == "" {
		fh.logger.Println("ERROR: get following count: empty user id")
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": "invalid request user id is required"})
		return
	}

	count, err := fh.followerStore.GetFollowingCount(userId)
	if err != nil {
		fh.logger.Printf("ERROR: get following count: %v", err)
		utils.WriteJSON(w, http.StatusInternalServerError, utils.Envelope{"error": "internal server error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, utils.Envelope{"message": "following count fetched successfully", "following_count": count})
}

func (fh *FollowerHandler) HandleGetAllFollowers(w http.ResponseWriter, r *http.Request) {
	businessId, err := utils.ReadParamID(r)
	if err != nil {
		fh.logger.Printf("ERROR: get all followers: %v", err)
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": err.Error()})
		return
	}

	if businessId == "" {
		fh.logger.Println("ERROR: get all followers: empty business id")
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": "invalid request business id is required"})
		return
	}

	res, err := fh.followerStore.GetAllFollowers(businessId)
	if err != nil {
		fh.logger.Printf("ERROR: get all followers: %v", err)
		utils.WriteJSON(w, http.StatusInternalServerError, utils.Envelope{"error": "internal server error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, utils.Envelope{"message": "followers fetched successfully", "followers": res})
}

func (fh *FollowerHandler) HandleGetAllFollowing(w http.ResponseWriter, r *http.Request) {
	userId, err := utils.ReadParamID(r)
	if err != nil {
		fh.logger.Printf("ERROR: get all following: %v", err)
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": err.Error()})
		return
	}

	if userId == "" {
		fh.logger.Println("ERROR: get all following: empty user id")
		utils.WriteJSON(w, http.StatusBadRequest, utils.Envelope{"error": "invalid request user id is required"})
		return
	}

	res, err := fh.followerStore.GetAllFollowing(userId)
	if err != nil {
		fh.logger.Printf("ERROR: get all following: %v", err)
		utils.WriteJSON(w, http.StatusInternalServerError, utils.Envelope{"error": "internal server error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, utils.Envelope{"message": "followings fetched successfully", "followings": res})
}
