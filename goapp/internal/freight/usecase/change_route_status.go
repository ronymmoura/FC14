package usecase

import (
	"time"

	"github.com/ronymmoura/fc14/internal/freight/entity"
)

type ChangeRouteStatusInput struct {
	ID         string            `json:"id"`
	StartedAt  entity.CustomTime `json:"started_at"`
	FinishedAt entity.CustomTime `json:"finished_at"`
	Event      string            `json:"event"`
}

type ChangeRouteStatusOutput struct {
	ID         string            `json:"id"`
	Status     string            `json:"status"`
	StartedAt  entity.CustomTime `json:"started_at"`
	FinishedAt entity.CustomTime `json:"finished_at"`
}

type ChangeRouteStatusUseCase struct {
	Repository entity.RouteRepository
}

func NewChangeRouteStatusUseCase(repository entity.RouteRepository) *ChangeRouteStatusUseCase {
	return &ChangeRouteStatusUseCase{
		Repository: repository,
	}
}

func (u *ChangeRouteStatusUseCase) Execute(input ChangeRouteStatusInput) (*ChangeRouteStatusOutput, error) {
	route, err := u.Repository.FindByID(input.ID)

	if err != nil {
		return nil, err
	}

	if input.Event == "RouteStarted" {
		route.Start(time.Time(input.StartedAt))
	}
	if input.Event == "RouteFinished" {
		route.Finish(time.Time(input.StartedAt))
	}

	err = u.Repository.Update(route)

	if err != nil {
		return nil, err
	}

	return &ChangeRouteStatusOutput{
		ID:         route.ID,
		Status:     "",
		StartedAt:  entity.CustomTime(route.StartedAt),
		FinishedAt: entity.CustomTime(route.FinishedAt),
	}, nil
}
