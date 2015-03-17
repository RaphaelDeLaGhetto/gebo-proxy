# gebo-proxy

Proxy server to enable multiple gebo agents to occupy the same secure domain.

# Installation

```
git clone https://github.com/RaphaelDeLaGhetto/gebo-proxy
cd gebo-proxy
sudo npm install
```

# Test

```
nodeunit test
```

# Configuration

By default `gebo.json` looks like this:

```
{
    "port": 3443,
    "ssl": {
        "key": "cert/ssl.key",
        "cert": "cert/ssl.crt"
    },
    "somegebo@example.com": "https://somecrazydomain.com",
    "anothergebo@capitolhill.ca": "https://localhost:4443"
}
```

There is a self-signed certificate/key pair in the the `cert/` directory. Obviously, you'll have to acquire or self-sign a certificate of your own.

To forward your gebo server address, simply add as many email/URL pairs as resources will allow. These 

```
    "somegebo@example.com": "https://somecrazydomain.com",
    "anothergebo@capitolhill.ca": "https://localhost:4443"
```

are for illustrative purposes and should be removed.

# Appendices

## Create a self-signed certificate

There's already a self-signed key and certificate in the `cert` directory. It was created with this command:

```
openssl req -x509 -newkey rsa:2048 -keyout ssl.key -out ssl.crt -days 3650 -nodes
```

## nginx

I like to serve up gebo [human-agent interfaces](https://github.com/RaphaelDeLaGhetto/grunt-init-gebo-react-hai)
with [nginx](http://nginx.org/). The following configuration serves up the HAI on port 80 and the gebo-proxy on 
443.

Create the configuration file:

```
sudo touch /etc/nginx/sites-available/somegebo-hai.conf
sudo ln -s /etc/nginx/sites-available/somegebo-hai.conf /etc/nginx/sites-enabled/somegebo-hai.conf
sudo vim /etc/nginx/sites-available/somegebo-hai.conf
```
Write this:

```
server {
    listen 80;
    server_name www.example.com;
    access_log /var/log/nginx/somegebo-hai.access.log;
    error_log /var/log/nginx/somegebo-hai.error.log;

    location / {
        alias /home/somegebo/live/somegebo-hai/dist/;
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 443;
    server_name www.example.com;

    ssl on;
    ssl_certificate /home/somegebo/live/gebo-proxy/cert/ssl.crt;
    ssl_certificate_key /home/somegebo/live/gebo-proxy/cert/ssl.key;
    ssl_session_cache shared:SSL:10m;

    location / {
        proxy_pass https://localhost:3443; # As configured in gebo-proxy's gebo.json
    }
}
```

The SSL config was adapted from [this example](http://chase-seibert.github.io/blog/2011/12/21/nginx-ssl-reverse-proxy-tutorial.html).

## Upstart

This is an example of you might configure gebo-proxy to run as a server.

Create a new configuration file:

```
sudo vim /etc/init/gebo-proxy.conf
```

Write this:

```
description "gebo-proxy for www.example.com"
author "RaphaelDeLaGhetto, raphael@theghetto.ca"

start on (local-filesystems and net-device-up IFACE!=lo)
stop on [!12345]

script
    chdir /home/somegebo/live/gebo-proxy
    exec /usr/bin/forever proxy.js >> /var/log/gebo-proxy.log 2>&1
    console log
end script
```

# License

MIT

