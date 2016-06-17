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
        if (id === 'hm-rpc.0.JEQ0066707.1.STATE') {
            console.log(state.val);
        }
        if (socket) socket.emit('stateChange', id, state);
    },
    unload: function (callback) {
        try {
            if (webServer) webServer.io.close();
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
    if (!adapter.config.apikey) {
        adapter.log.error('No api-key found. Please get one on https://cloud.iobroker.net');
        process.stop();
        return;
    }
    
    adapter.setState('info.connection', false, true);
    
    socket = require('socket.io-client')('http://localhost:10555');
    
    socket.on('connect', function () {
        adapter.log.info('Connection changed: CONNECTED');
        adapter.setState('info.connection', true, true);
    });
    
    socket.on('disconnect', function () {
        adapter.log.info('Connection changed: DISCONNECTED');
        adapter.setState('info.connection', false, true);
    });

    socket.on('error', function(error){
        console.log('error: ' + error);
    });
    
    var server = 'http://localhost:8082';

    socket.on('html', function (url, cb) {
        request({url: server + url, encoding: null}, function (error, response, body) {
            cb(error, response.statusCode, response.headers, body);
        });
    });

    ioSocket = new IOSocket(socket, {clientid: adapter.config.apikey}, adapter);
}
