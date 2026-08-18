FROM docker.io/library/golang:latest AS build

COPY go.mod go.sum .

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o /usr/local/bin/vanlug-api .

FROM gcr.io/distroless/static-debian13

COPY --from=build /usr/local/bin/vanlug-api /usr/local/bin/vanlug-api

CMD ["/usr/local/bin/vanlug-api"]
