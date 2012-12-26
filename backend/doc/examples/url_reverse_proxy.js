var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    httpProxy = require('http-proxy');
var proxyByUrl = require('proxy-by-url');

var serverOptions = {
    https: {
	key: fs.readFileSync('conf/ssl/site.key', 'utf8'),
	cert: fs.readFileSync('conf/ssl/site.crt', 'utf8'),
    }
};

var proxyOptions = {
    '/identity.api.rackspacecloud.com': { port: 443, host: 'identity.api.rackspacecloud.com', target: { https: true} },
    '/dfw.servers.api.rackspacecloud.com': { port: 443, host: 'dfw.servers.api.rackspacecloud.com', target: { https: true} },
};
    

// Create a standalone HTTPS proxy server
httpProxy.createServer(proxyByUrl(proxyOptions),
		       function (req, res) {
			   res.writeHead(400, { 'Content-Type': 'text/plain' });
			   res.write('Bad Request');
			   res.end();
		       },
		       serverOptions)
    .listen(8443);
