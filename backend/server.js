/////////////////////////////////////////////////////////////////////
// Imports
var express = require('express');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var httpProxy = require('http-proxy');
var proxyByUrl = require('proxy-by-url');
var io = require('socket.io');
var yaml = require('js-yaml');
var _ = require('underscore');
var _s = require('underscore.string');
var log = require('winston');

/////////////////////////////////////////////////////////////////////
// Load Configuration
var config = null;
{
    var configFile = "./conf/custom-config.yaml";
    if (process.argv.length > 2) {
	configFile = process.argv[2];
    }
    log.info(_s.sprintf("loading configFile=[%s]", configFile))
    var contents = fs.readFileSync(configFile).toString();
    config = yaml.load(contents).config;
}

/////////////////////////////////////////////////////////////////////
// Initialize Logging
log.add(log.transports.File, { filename: config.log.filename });
log.info('logging initialized');
    
/////////////////////////////////////////////////////////////////////
// Main

// Initiate the web framework
var app = express();
app.set('port', config.server.port || 8080);
app.use(express.logger('dev'));
app.use(express.bodyParser()); // HTTP Params Parsing
app.use(express.cookieParser()); // Cookie Parsing
app.use("/", express.static(__dirname + '/www'));
app.listen(8080);

// Configure the Proxy Server
var serverOptions = {
    https: {
	key: fs.readFileSync('conf/ssl/site.key', 'utf8'),
	cert: fs.readFileSync('conf/ssl/site.crt', 'utf8'),
    }
};

var proxyOptions = {
    '/identity.api.rackspacecloud.com': { port: 443, host: 'identity.api.rackspacecloud.com', target: { https: true} },
    '/dfw.servers.api.rackspacecloud.com': { port: 443, host: 'dfw.servers.api.rackspacecloud.com', target: { https: true} },
    '/xmobile': { port: 8080, host: 'localhost', target: { https: false} },
};

// Initiate the Proxy Server
//  Proxy first, because Express.bodyParser messes with the proxied request.
httpProxy.createServer(proxyByUrl(proxyOptions),
		       function (req, res) {
			   res.writeHead(400, { 'Content-Type': 'text/plain' });
			   res.write('Bad Request');
			   res.end();
		       },
		       serverOptions)
    .listen(8443);
