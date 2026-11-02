FROM golang:1.25-alpine AS builder
WORKDIR /usr/src/app

RUN apk --no-cache add bash git make gettext

COPY go.mod go.sum ./
COPY config.json ./config.json

RUN go mod download

COPY . .

RUN go build -o /app/bin/app ./cmd/app

FROM alpine:3.18 AS runner
WORKDIR /usr/src/app

COPY --from=builder /app/bin/app /app/bin/app
COPY --from=builder /usr/src/app/config.json ./config.json

CMD ["/app/bin/app"]