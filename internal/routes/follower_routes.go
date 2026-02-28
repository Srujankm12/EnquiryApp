package routes

import (
	"github.com/go-chi/chi/v5"
	"github.com/shubhangcs/agromart-server/internal/app"
)

func followerRoutes(app *app.Application, r *chi.Mux) {
	r.Route("/follower", func(r chi.Router) {
		r.Post("/follow", app.FollowHandler.HandleCreateFollower)
		r.Post("/unfollow", app.FollowHandler.HandleRemoveFollower)
		r.Get("/get/followers/count/{id}", app.FollowHandler.HandleGetFollowersCount)
		r.Get("/get/following/count/{id}", app.FollowHandler.HandleGetFollowingCount)
		r.Get("/get/followers/{id}", app.FollowHandler.HandleGetAllFollowers)
		r.Get("/get/followings/{id}", app.FollowHandler.HandleGetAllFollowing)
	})
}
