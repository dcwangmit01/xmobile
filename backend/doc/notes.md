npm view js-yaml versions

# Generate SSL Priv Key and Cert
openssl req -x509 -nodes -days 3650 -newkey rsa:4096 -keyout conf/ssl/site.key -out conf/ssl/site.crt


SSL Incoming
