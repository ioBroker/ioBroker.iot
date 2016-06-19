/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

var utils    = require(__dirname + '/lib/utils'); // Get common adapter utils
var IOSocket = require(utils.appName + '.socketio/lib/socket.js');
var request  = require('request');

var socket    = null;
var ioSocket  = null;

var adapter = utils.adapter({
    name: 'cloud',
    objectChange: function (id, obj) {
        if (socket) socket.emit('objectChange', id, obj);
    },
    stateChange: function (id, state) {
        if (socket) socket.emit('stateChange', id, state);
    },
    unload: function (callback) {
        try {
            if (socket) socket.close();
            ioSocket = null;
            callback();
        } catch (e) {
            callback();
        }
    },
    ready: function () {
        main();
    }
});

function main() {
    //process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    if (!adapter.config.apikey) {
        adapter.log.error('No api-key found. Please get one on https://iobroker.net');
        process.stop();
        return;
    }
    
    adapter.setState('info.connection', false, true);
    adapter.config.cloudUrl  = adapter.config.cloudUrl || 'https://iobroker.net:10555';

    adapter.log.info('Connecting with ' + adapter.config.cloudUrl + ' with "' + adapter.config.apikey + '"');
    socket = require('socket.io-client')(adapter.config.cloudUrl || 'https://iobroker.net:10555', {
        rejectUnauthorized: !adapter.config.allowSelfSignedCertificate
    });
    
    socket.on('connect', function () {
        adapter.log.info('Connection changed: CONNECTED');
        adapter.setState('info.connection', true, true);
    });
    
    socket.on('disconnect', function () {
        adapter.log.info('Connection changed: DISCONNECTED');
        adapter.setState('info.connection', false, true);
    });

    socket.on('error', function (error){
        adapter.log.error('Connection error: ' + error);
        console.log('error: ' + error);
    });
    
    var server = 'http://localhost:8082';
    socket.on('html', function (url, cb) {
        request({url: server + url, encoding: null}, function (error, response, body) {
            cb(error, response.statusCode, response.headers, body);
        });
    });

    if (adapter.config.instance) {
        if (adapter.config.instance.substring(0, 'system.adapter.'.length) !== 'system.adapter.') {
            adapter.config.instance = 'system.adapter.' + adapter.config.instance;
        }

        adapter.getForeignObject(adapter.config.instance, function (err, obj) {
            if (obj) {
                server = 'http' + (obj.native.secure ? 's' : '')  + '://';
                // todo if run on other host
                server += (!obj.native.bind || obj.native.bind === '0.0.0.0') ? '127.0.0.1' : obj.native.bind;
                server += ':' + obj.native.port;

                ioSocket = new IOSocket(socket, {clientid: adapter.config.apikey}, adapter);
            } else {
                adapter.log.error('Unknown instance ' + adapter.log.instance);
                throw new Error('Unknown instance ' + adapter.log.instance);
            }
        });
    } else {
        ioSocket = new IOSocket(socket, {clientid: adapter.config.apikey.trim()}, adapter);
    }
}
