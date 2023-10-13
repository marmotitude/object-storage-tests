FROM grafana/xk6:latest as k6builder
WORKDIR /app
RUN xk6 build v0.43.1 --with github.com/grafana/xk6-exec@v0.3.0


FROM alpine:3
RUN apk add coreutils aws-cli rclone just openssl dasel
COPY --from=k6builder /app/k6 /usr/bin/k6
WORKDIR /app
COPY src /app/src
COPY justfile /app/justfile
ENTRYPOINT ["just", "-f", "/app/justfile"]
