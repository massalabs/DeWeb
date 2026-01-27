FROM --platform=linux/amd64 alpine:latest

# Update package list and install required certificates
RUN apk --no-cache add ca-certificates \
    && apk add --no-cache libc6-compat

# Set a working directory (optional)
WORKDIR /app

# Copy the local binary into the container
COPY ./deweb-server_linux_amd64 /app/deweb-server_linux_amd64

# Give execution permissions to the binary
RUN chmod +x /app/deweb-server_linux_amd64

# Expose the port on which the server listens (optional, if needed)
EXPOSE 8080

# Command to run the server
CMD ["./deweb-server_linux_amd64"]
