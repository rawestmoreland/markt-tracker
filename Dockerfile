# CSS Build stage
FROM node:20-alpine AS css-builder
WORKDIR /build

# Only copy over the package management metadata first
COPY ./pb_public/package*.json .
RUN npm ci

COPY ./pb_public/input.css input.css

# Generates the minified production output.css inside /pb_public/
RUN npx @tailwindcss/cli -i ./input.css -o ./output.css --minify

# Go Build stage
FROM golang:1.27.0-alpine AS go-builder

# Set working directory for the build
WORKDIR /build

# Install necessary build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy the Go project
COPY . .

# Download Go dependencies
RUN go mod download

# Extract the output CSS folder into the Go build
COPY --from=css-builder /build/output.css ./pb_public/output.css

# Build the application
RUN CGO_ENABLED=1 go build -ldflags="-s -w" -o pocketbase .

# Final stage - similar to your original Dockerfile
FROM alpine:latest

# Install necessary runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create app directory
RUN mkdir -p /pb/pb_data /pb/pb_public /pb/pb_migrations

# Copy the compiled binary from the builder stage
COPY --from=go-builder /build/pocketbase /pb/

# Set proper permissions
RUN chmod +x /pb/pocketbase

# Expose the port
EXPOSE 8080

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]