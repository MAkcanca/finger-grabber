#!/bin/sh

# Replace environment variables in the template
envsubst '$SERVER_DOMAIN' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx
nginx -g 'daemon off;'