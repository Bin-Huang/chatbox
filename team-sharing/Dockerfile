FROM caddy:2.7.3

COPY ./Caddyfile /etc/caddy/Caddyfile
COPY ./main.sh /usr/src/www/main.sh

RUN chmod +x /usr/src/www/main.sh

ENTRYPOINT ["sh", "-c", "/usr/src/www/main.sh"]
