package store

import (
	"database/sql"
	"time"
)

type Follower struct {
	UserID     string    `json:"user_id"`
	BusinessID string    `json:"business_id"`
	CreatedAT  time.Time `json:"created_at"`
}

type FollowerDetails struct {
	FollowerID           string    `json:"follower_id"`
	FollowerProfileImage string    `json:"follower_profile_image"`
	FollowerName         string    `json:"follower_name"`
	FollowerEmail        string    `json:"follower_email"`
	FollowerPhone        string    `json:"follower_phone"`
	CreatedAT            time.Time `json:"created_at"`
}

type FollowingDetails struct {
	FollowingID           string  `json:"following_id"`
	FollowingProfileImage string  `json:"following_profile_image"`
	FollowingName         string  `json:"following_name"`
	FollowingPhone        string  `json:"following_phone"`
	FollowingAddress      string  `json:"following_address"`
	FollowingCity         string  `json:"following_city"`
	FollowingState        string  `json:"following_state"`
	FollowingTelegram     *string `json:"following_telegram"`
}

type PostgresFollowerStore struct {
	db *sql.DB
}

type FollowerStore interface {
	CreateFollower(*Follower) error
	RemoveFollower(*Follower) error
	GetFollowersCount(id string) (int, error)
	GetFollowingCount(id string) (int, error)
	GetAllFollowers(id string) ([]FollowerDetails, error)
	GetAllFollowing(id string) ([]FollowingDetails, error)
}

func NewPostgresFollowerStore(db *sql.DB) *PostgresFollowerStore {
	return &PostgresFollowerStore{
		db: db,
	}
}

func (pfs *PostgresFollowerStore) CreateFollower(f *Follower) error {
	query := `
	INSERT INTO followers(
		business_id,
		user_id
	) VALUES (
		$1, $2
	);
	`

	res, err := pfs.db.Exec(query, f.BusinessID, f.UserID)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (pfs *PostgresFollowerStore) RemoveFollower(f *Follower) error {
	query := `
	DELETE FROM followers
	WHERE user_id = $1 AND
	business_id = $2;
	`

	res, err := pfs.db.Exec(query, f.UserID, f.BusinessID)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (pfs *PostgresFollowerStore) GetFollowersCount(id string) (int, error) {
	query := `
	SELECT COUNT(*) FROM followers WHERE business_id = $1;
	`
	var count int
	err := pfs.db.QueryRow(
		query,
		id,
	).Scan(
		&count,
	)

	if err != nil {
		return 0, err
	}

	return count, nil
}

func (pfs *PostgresFollowerStore) GetFollowingCount(id string) (int, error) {
	query := `
	SELECT COUNT(*) FROM followers WHERE user_id = $1;
	`
	var count int
	err := pfs.db.QueryRow(
		query,
		id,
	).Scan(
		&count,
	)

	if err != nil {
		return 0, err
	}

	return count, nil
}

func (pfs *PostgresFollowerStore) GetAllFollowers(id string) ([]FollowerDetails, error) {
	query := `
	SELECT
		u.id,
		CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS name,
		u.profile_image,
		u.email,
		u.phone,
		u.created_at
	FROM followers f
	JOIN users u
	ON u.id = f.user_id
	WHERE f.business_id = $1;
	`

	res, err := pfs.db.Query(query, id)
	if err != nil {
		return nil, err
	}
	defer res.Close()

	var followers []FollowerDetails
	for res.Next() {
		var f FollowerDetails
		err = res.Scan(
			&f.FollowerID,
			&f.FollowerName,
			&f.FollowerProfileImage,
			&f.FollowerEmail,
			&f.FollowerPhone,
			&f.CreatedAT,
		)
		if err != nil {
			return nil, err
		}

		followers = append(followers, f)
	}

	if res.Err() != nil {
		return nil, res.Err()
	}

	return followers, nil
}

func (pfs *PostgresFollowerStore) GetAllFollowing(id string) ([]FollowingDetails, error) {
	query := `
	SELECT
		b.id,
		b.business_profile_image,
		b.business_name,
		b.business_phone,
		b.address,
		b.city,
		b.state,
		bs.telegram
	FROM followers f
	JOIN businesses b
		ON b.id = f.business_id
	JOIN business_socials bs
		ON bs.business_id = f.business_id
	WHERE user_id = $1;
	`

	res, err := pfs.db.Query(query, id)
	if err != nil {
		return nil, err
	}
	defer res.Close()

	var followings []FollowingDetails
	for res.Next() {
		var f FollowingDetails
		err := res.Scan(
			&f.FollowingID,
			&f.FollowingProfileImage,
			&f.FollowingName,
			&f.FollowingPhone,
			&f.FollowingAddress,
			&f.FollowingCity,
			&f.FollowingState,
			&f.FollowingTelegram,
		)
		if err != nil {
			return nil, err
		}

		followings = append(followings, f)
	}

	if res.Err() != nil {
		return nil, res.Err()
	}

	return followings, nil
}
