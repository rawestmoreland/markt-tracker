# CSS build stage
FROM node:20-alpine AS css-builder
WORKDIR /build

# Dependencies first so this layer is cached until package files change
COPY pb_public/package*.json ./
RUN npm ci

COPY pb_public/input.css ./
RUN npx @tailwindcss/cli -i ./input.css -o ./output.css --minify

# Go build stage
FROM golang:1.27-alpine AS go-builder
WORKDIR /build

# Module download layer is cached until go.mod/go.sum change
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY main.go ./
COPY migrations ./migrations
# PocketBase uses pure-Go SQLite (modernc), so no CGO/gcc is needed
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -ldflags="-s -w" -o pocketbase .

# Final stage
FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /pb
COPY --from=go-builder /build/pocketbase ./pocketbase

# Only the files the frontend actually serves (not import.mjs, markets.json, node_modules...)
COPY pb_public/index.html pb_public/app.js pb_public/auth.js pb_public/add.js pb_public/i18n.js pb_public/favicon.ico pb_public/santa.png ./pb_public/
COPY --from=css-builder /build/output.css ./pb_public/output.css

EXPOSE 8080
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
