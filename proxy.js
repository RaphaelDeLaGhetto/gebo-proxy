var fs = require('fs'),
    httpProxy = require('http-proxy'),
    https = require('https'),
    nconf = require('nconf'),
    url = require('url'),
    winston = require('winston');


// logger
var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

// Configuration
nconf.file({ file: './gebo.json' });


/**
 * The doohickey that actually forwards the request
 */
var _proxy = httpProxy.createProxyServer({});
exports.proxy = _proxy;

/**
 * Handle incoming requests to the HTTPS server
 *
 * @param object
 * @param object
 */
var _requestHandler = function(req, res) {
    var target;
    var urlParts = url.parse(req.url, true);

    // If there's a body, then there's probably a message inside
    if (req.body) {

      // No receiver specified
      if (!req.body.receiver) {
        res.end('A receiver needs to be specified in the message');
        return;
      }

      target = nconf.get(req.body.receiver);

      if (!target) {
        res.end(req.body.receiver + ' is not registered with this proxy');
        return;
      }
    }
    // Check for receiver in query string
    else if (urlParts.query.receiver){
      target = nconf.get(urlParts.query.receiver);

      if (!target) {
        res.end(urlParts.query.receiver + ' is not registered with this proxy');
        return;
      }
    }

    if (target) {
      _proxy.web(req, res, { target: target + urlParts.path, secure: false });
    }
    else {
      res.end('I don\'t know where to forward that message');
    }
  };
exports.requestHandler = _requestHandler;


/**
 * HTTPS certificate and key
 */
var options = {
    key: fs.readFileSync(nconf.get('ssl').key, 'utf8'),
    cert: fs.readFileSync(nconf.get('ssl').cert, 'utf8'),
};

/**
 * The HTTPS server
 */
var _server = https.createServer(options, _requestHandler);
exports.server = _server;

/**
 * Tune in to the configured port
 */
_server.listen(nconf.get('port'));
