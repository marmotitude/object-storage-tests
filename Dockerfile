# k6 with extensions: xk6-exec, xk6-file
FROM grafana/xk6:0.9.2 as k6builder
WORKDIR /app
# TODO: return to the upstream grafana/xk6-exec and stop using a fork
# once https://github.com/grafana/xk6-exec/issues/12 gets fixed
RUN xk6 build v0.43.1 \
      --with github.com/marmotitude/xk6-exec@af43fae \
      --with github.com/avitalique/xk6-file@v1.4.0 \
      --with github.com/szkiba/xk6-yaml@latest

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

# Python pip
ENV PIP_ROOT_USER_ACTION=ignore
RUN apk add python3 py3-pip py3-netifaces
RUN pip install --upgrade --no-cache-dir pip

# Install swift-cli
RUN pip install --no-cache-dir python-swiftclient
RUN pip install --no-cache-dir python-keystoneclient

WORKDIR /app
COPY src /app/src
COPY vendor /app/vendor
COPY justfile /app/justfile
COPY requirements.txt /app/requirements.txt
COPY LICENSE /app/LICENSE
RUN pip install --no-cache-dir --no-dependencies -r requirements.txt
RUN mkdir /app/config
ENTRYPOINT ["just", "-f", "/app/justfile"]
