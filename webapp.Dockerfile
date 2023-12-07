# Use main image as base
FROM ghcr.io/marmotitude/object-storage-tests:main

# Install Nginx
RUN apk update && \
    apk add nginx

# Keep a backup of alpine's default nginx config
RUN mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.orig

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Set the working directory to /app
WORKDIR /app

# Create the directory for the results
RUN mkdir -p results

# Set ownership and permissions for Nginx to read from /app/results
RUN chown -R root:root results && \
    chmod -R 755 results

# Write dummy file to results directory with a smile and timestamp
RUN printf ":-)\n\nBuilded on $(date) by:$(hostname)" > results/smile.txt

# Copy the shell script that runs desired tests outputing to results folder
# this script will be executed by an external scheduler periodically
COPY run_tests.sh

# Expose port 5000
EXPOSE 5000

# Override the main image's entry point and set the default command
ENTRYPOINT ["nginx", "-g", "daemon off;"]
CMD []
