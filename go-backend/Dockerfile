# Build stage
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /chess-server .

# Runtime stage: static binary plus CA certificates for the RUM ping
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /chess-server /chess-server
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/chess-server"]
