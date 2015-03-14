# gebo-proxy
Proxy server to enable multiple gebo agents to occupy the same domain


# Configuration


# Appendix

## Create a self-signed certificate

There's already a self-signed key and certificate in the `cert` directory. It was created with this command:

```
openssl req -x509 -newkey rsa:2048 -keyout ssl.key -out ssl.crt -days 3650 -nodes
```

