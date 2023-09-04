package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	ckafka "github.com/confluentinc/confluent-kafka-go/v2/kafka"
	_ "github.com/go-sql-driver/mysql"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/ronymmoura/fc14/internal/freight/entity"
	"github.com/ronymmoura/fc14/internal/freight/infra/repository"
	"github.com/ronymmoura/fc14/internal/freight/usecase"
	"github.com/ronymmoura/fc14/pkg/kafka"
)

var (
	routesCreated = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "routes_created_total",
			Help: "Total number of created routes",
		},
	)

	routesStarted = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "routes_started_total",
			Help: "Total number of started routes",
		},
		[]string{"status"},
	)

	errorsTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "errors_total",
			Help: "Total number of errors",
		},
	)
)

func init() {
	prometheus.MustRegister(routesStarted)
	prometheus.MustRegister(errorsTotal)
	prometheus.MustRegister(routesCreated)
}

func main() {
	db, err := sql.Open("mysql", "root:root@tcp(mysql:3306)/routes?parseTime=true")

	if err != nil {
		panic(err)
	}

	defer db.Close()

	http.Handle("/metrics", promhttp.Handler())
	go http.ListenAndServe(":8080", nil)

	msgChan := make(chan *ckafka.Message)
	topics := []string{"route"}
	servers := "kafka:9094"

	go kafka.Consume(topics, servers, msgChan)

	fmt.Println("Running...")

	repository := repository.NewRouteRepository(db)
	freight := entity.NewFreight(10)

	createRouteUseCase := usecase.NewCreateRouteUseCase(repository, freight)
	changeRouteStatusUseCase := usecase.NewChangeRouteStatusUseCase(repository)

	for msg := range msgChan {
		fmt.Println("Received")

		input := usecase.CreateRouteInput{}
		json.Unmarshal(msg.Value, &input)
		fmt.Println(input)

		switch input.Event {

		case "RouteCreated":
			output, err := createRouteUseCase.Execute(input)
			if err != nil {
				fmt.Println(err)
				errorsTotal.Inc()
			} else {
				routesCreated.Inc()
			}

			fmt.Println(output)

		case "RouteStarted":
			input := usecase.ChangeRouteStatusInput{}
			json.Unmarshal(msg.Value, &input)
			_, err := changeRouteStatusUseCase.Execute(input)
			if err != nil {
				fmt.Println(err)
				errorsTotal.Inc()
			} else {
				routesStarted.WithLabelValues("started").Inc()
			}

		case "RouteFinished":
			input := usecase.ChangeRouteStatusInput{}
			json.Unmarshal(msg.Value, &input)
			_, err := changeRouteStatusUseCase.Execute(input)
			if err != nil {
				fmt.Println(err)
				errorsTotal.Inc()
			} else {
				routesStarted.WithLabelValues("finished").Inc()
			}
		}
	}
}
