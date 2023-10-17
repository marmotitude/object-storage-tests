# k6 with extensions: xk6-exec, xk6-file
FROM grafana/xk6:0.9.2 as k6builder
WORKDIR /app
RUN xk6 build v0.43.1 \
      --with github.com/grafana/xk6-exec@v0.3.0 \
      --with github.com/avitalique/xk6-file@v1.4.0

# gotpl
FROM alpine:3 as gotplbuilder
WORKDIR /app
RUN wget https://github.com/belitre/gotpl/releases/download/v0.7/gotpl-v0.7-linux-amd64.zip && unzip gotpl-v0.7-linux-amd64.zip
RUN cp linux-amd64/gotpl /app

# main image
FROM alpine:3
RUN apk update && \
    apk add coreutils aws-cli rclone \
            just openssl dasel
COPY --from=k6builder /app/k6 /usr/bin/k6
COPY --from=gotplbuilder /app/gotpl /usr/bin/gotpl

# Install swift-cli
ENV PIP_ROOT_USER_ACTION=ignore
RUN apk add python3 py3-pip
RUN pip install python-swiftclient

WORKDIR /app
COPY src /app/src
COPY justfile /app/justfile
COPY LICENSE /app/LICENSE
RUN mkdir /app/config
ENTRYPOINT ["just", "-f", "/app/justfile"]
