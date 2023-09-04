package repository

import (
	"database/sql"

	"github.com/ronymmoura/fc14/internal/freight/entity"
)

type RouteRepositoryMysql struct {
	db *sql.DB
}

func NewRouteRepository(db *sql.DB) *RouteRepositoryMysql {
	return &RouteRepositoryMysql{
		db: db,
	}
}

func (r *RouteRepositoryMysql) Create(route *entity.Route) error {
	sql := "INSERT INTO routes (id, name, distance, status, freight_price) VALUES(?, ?, ?, ?, ?)"
	_, err := r.db.Exec(sql, route.ID, route.Name, route.Distance, route.Status, route.FreightPrice)

	if err != nil {
		return err
	}

	return nil
}

func (r *RouteRepositoryMysql) FindByID(id string) (*entity.Route, error) {
	sqlSmt := "SELECT id, name, distance, status, freight_price, started_at, finished_at FROM routes WHERE ID = ?"
	row := r.db.QueryRow(sqlSmt, id)

	var startedAt, finishedAt sql.NullTime

	var route entity.Route
	err := row.Scan(
		&route.ID,
		&route.Name,
		&route.Distance,
		&route.Status,
		&route.FreightPrice,
		&startedAt,
		&finishedAt)

	if startedAt.Valid {
		route.StartedAt = startedAt.Time
	}

	if finishedAt.Valid {
		route.FinishedAt = finishedAt.Time
	}

	if err != nil {
		return nil, err
	}

	return &route, nil
}

func (r *RouteRepositoryMysql) Update(route *entity.Route) error {
	startedAt := route.StartedAt.Format("2006-01-02 15:04:05")
	finishedAt := route.FinishedAt.Format("2006-01-02 15:04:05")

	sql := "UPDATE routes SET distance = ?, status = ?, freight_price = ?, started_at = ?, finished_at = ? WHERE id = ?"
	_, err := r.db.Exec(sql, route.Distance, route.Status, route.FreightPrice, startedAt, finishedAt, route.ID)

	if err != nil {
		return err
	}

	return nil
}
