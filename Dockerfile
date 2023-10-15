# k6 with xk6-exec
FROM grafana/xk6:latest as k6builder
WORKDIR /app
RUN xk6 build v0.43.1 --with github.com/grafana/xk6-exec@v0.3.0

# gotpl
FROM alpine:3 as gotplbuilder
WORKDIR /app
RUN wget https://github.com/belitre/gotpl/releases/download/v0.7/gotpl-v0.7-linux-amd64.zip && unzip gotpl-v0.7-linux-amd64.zip
RUN cp linux-amd64/gotpl /app

FROM alpine:3
RUN apk add coreutils aws-cli rclone just openssl dasel
COPY --from=k6builder /app/k6 /usr/bin/k6
COPY --from=gotplbuilder /app/gotpl /usr/bin/gotpl
WORKDIR /app
COPY src /app/src
COPY justfile /app/justfile
ENTRYPOINT ["just", "-f", "/app/justfile"]
