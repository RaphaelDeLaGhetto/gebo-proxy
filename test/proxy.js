
var fs = require('fs'),
    httpMocks = require('node-mocks-http'),
    nconf = require('nconf'),
    sinon = require('sinon');

nconf.file({ file: '../gebo.json' });

var _httpProxy, _proxy, _https;

/**
 * onload
 */
exports.onload = {
    setUp: function(callback) {
        _https = require('https');
        sinon.stub(_https, 'createServer', function(options, done) {
            return { listen: sinon.spy() };    
          });

        _httpProxy = require('http-proxy');
        sinon.stub(_httpProxy, 'createProxyServer', function(options) {
            return { web: sinon.spy() };
          });

        _proxy = require('../proxy');
        callback();
    },

    tearDown: function(callback) {
        _https.createServer.restore();
        _httpProxy.createProxyServer.restore();
        callback();
    },

    'Should create a server with the correct configured options': function(test) {
        test.expect(3);

        test.equal(_https.createServer.callCount, 1);
        test.equal(JSON.stringify(_https.createServer.getCall(0).args[0]), JSON.stringify({
            key: fs.readFileSync(nconf.get('ssl').key, 'utf8'),
            cert: fs.readFileSync(nconf.get('ssl').cert, 'utf8'),
          }));
        test.equal(typeof _https.createServer.getCall(0).args[1], 'function');

        test.done();
    },

    'Server should listen on the port specified in gebo.json': function(test) {
        test.expect(2);

        test.equal(_proxy.server.listen.callCount, 1);
        test.ok(_proxy.server.listen.calledWith(nconf.get('port')));

        test.done();
    },
};

/**
 * requestHandler
 */
exports.requestHandler = {

    setUp: function(callback) {
        _https = require('https');
        sinon.stub(_https, 'createServer', function(options, done) {
            return { listen: sinon.spy() };    
          });

        _httpProxy = require('http-proxy');
        sinon.stub(_httpProxy, 'createProxyServer', function(options) {
            return { web: sinon.spy() };
          });

        _proxy = require('../proxy');
        callback();
    },

    tearDown: function(callback) {
        _https.createServer.restore();
        _httpProxy.createProxyServer.restore();
        _proxy.proxy.web.reset();
        callback();
    },

    'Forward to the proxy address associated with the receiver key': function(test) {
        test.expect(5);
        var req = httpMocks.createRequest({
                method: 'POST',
                url: 'https://someweirddomain.com/perform',
                body: {
                    sender: 'someagent@somedomain.com',
                    receiver: 'somegebo@example.com',
                    action: 'ls',
                    content: {
                        resource: 'friendos',
                    },
                },
          });
        var res = httpMocks.createResponse();

        _proxy.requestHandler(req, res)
        test.equal(_proxy.proxy.web.callCount, 1);
        test.equal(_proxy.proxy.web.getCall(0).args[0], req);
        test.equal(_proxy.proxy.web.getCall(0).args[1], res);
        test.equal(_proxy.proxy.web.getCall(0).args[2].target, 'https://somecrazydomain.com/perform');
        test.equal(_proxy.proxy.web.getCall(0).args[2].secure, false);

        test.done();
    },

    'Don\'t barf if no receiver key set': function(test) {
        test.expect(3);
        var req = httpMocks.createRequest({
                method: 'POST',
                url: 'https://someweirddomain.com/perform',
                body: {
                    sender: 'someagent@somedomain.com',
                    action: 'ls',
                    content: {
                        resource: 'friendos',
                    },
                },
          });
        var res = httpMocks.createResponse();

        _proxy.requestHandler(req, res)

        test.equal(_proxy.proxy.web.callCount, 0);
        test.ok(res._isEndCalled());
        test.equal(res._getData(), 'A receiver needs to be specified in the message');

        test.done();
    },

    'Don\'t barf if no address associated with receiver key': function(test) {
        test.expect(3);
        var req = httpMocks.createRequest({
                method: 'POST',
                url: 'https://someweirddomain.com/perform',
                body: {
                    sender: 'someagent@somedomain.com',
                    receiver: 'nosuchgebo@example.com',
                    action: 'ls',
                    content: {
                        resource: 'friendos',
                    },
                },
          });
        var res = httpMocks.createResponse();

        _proxy.requestHandler(req, res)

        test.equal(_proxy.proxy.web.callCount, 0);
        test.ok(res._isEndCalled());
        test.equal(res._getData(), 'nosuchgebo@example.com is not registered with this proxy');

        test.done();
    },

    'Don\'t barf if no body or receiver query string parameter is set': function(test) {
        test.expect(3);
        var req = httpMocks.createRequest({
                method: 'POST',
                url: 'https://someweirddomain.com/login',
          });
        delete req.body;
        var res = httpMocks.createResponse();

        _proxy.requestHandler(req, res)

        test.equal(_proxy.proxy.web.callCount, 0);
        test.ok(res._isEndCalled());
        test.equal(res._getData(), 'I don\'t know where to forward that message');

        test.done();
    },

    'Forward to receiver indentified in the query string': function(test) {
        test.expect(5);
        var req = httpMocks.createRequest({
                method: 'POST',
                url: 'https://someweirddomain.com/login?receiver=anothergebo@capitolhill.ca',
          });
        delete req.body;
        var res = httpMocks.createResponse();

        _proxy.requestHandler(req, res)

        test.equal(_proxy.proxy.web.callCount, 1);
        test.equal(_proxy.proxy.web.getCall(0).args[0], req);
        test.equal(_proxy.proxy.web.getCall(0).args[1], res);
        test.equal(_proxy.proxy.web.getCall(0).args[2].target, 'https://localhost:4443/login?receiver=anothergebo@capitolhill.ca');
        test.equal(_proxy.proxy.web.getCall(0).args[2].secure, false);

        test.done();
    },

    'Don\'t barf if receiver indentified in the query string does not exist': function(test) {
        test.expect(3);
        var req = httpMocks.createRequest({
                method: 'POST',
                url: 'https://someweirddomain.com/login?receiver=nosuchagent@nosuchdomain.ca',
          });
        delete req.body;
        var res = httpMocks.createResponse();

        _proxy.requestHandler(req, res)

        test.equal(_proxy.proxy.web.callCount, 0);
        test.ok(res._isEndCalled());
        test.equal(res._getData(), 'nosuchagent@nosuchdomain.ca is not registered with this proxy');

        test.done();
    },

};


