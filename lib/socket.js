/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
/* jshint -W061 */
'use strict';

var socketio     = require('socket.io');
var path         = require('path');
var fs           = require('fs');
var cookieParser = require('cookie-parser');
var request      = null;
var EventEmitter = require('events');
var util         = require('util');

// From settings used only secure, auth and crossDomain
function IOSocket(server, settings, adapter) {
    if (!(this instanceof IOSocket)) return new IOSocket(server, settings, adapter);

    this.settings   = settings || {};
    this.adapter    = adapter;
    this.webServer  = server;
    this.subscribes = {};

    var that = this;
// do not send too many state updates
    var eventsThreshold = {
        count:          0,
        timeActivated:  0,
        active:         false,
        accidents:      0,
        repeatSeconds:  3,   // how many seconds continuously must be number of events > value
        value:          200, // how many events allowed in one check interval
        checkInterval:  1000 // duration of one check interval
    };

    // Extract user name from socket
    function getUserFromSocket(socket, callback) {
        var wait = false;
        try {
            if (socket.handshake.headers.cookie && (!socket.request || !socket.request._query || !socket.request._query.user)) {
                var cookie = decodeURIComponent(socket.handshake.headers.cookie);
                var m = cookie.match(/connect\.sid=(.+)/);
                if (m) {
                    // If session cookie exists
                    var c = m[1].split(';')[0];
                    var sessionID = cookieParser.signedCookie(c, that.settings.secret);
                    if (sessionID) {
                        // Get user for session
                        wait = true;
                        that.settings.store.get(sessionID, function (err, obj) {
                            if (obj && obj.passport && obj.passport.user) {
                                socket._sessionID = sessionID;
                                if (typeof callback === 'function') {
                                    callback(null, obj.passport.user);
                                } else {
                                    that.adapter.log.warn('[getUserFromSocket] Invalid callback')
                                }
                            } else {
                                if (typeof callback === 'function') {
                                    callback('unknown user');
                                } else {
                                    that.adapter.log.warn('[getUserFromSocket] Invalid callback')
                                }
                            }
                        });
                    }
                }
            }
            if (!wait) {
                var user = socket.request._query.user;
                var pass = socket.request._query.pass;
                if (user && pass) {
                    wait = true;
                    that.adapter.checkPassword(user, pass, function (res) {
                        if (res) {
                            that.adapter.log.debug('Logged in: ' + user);
                            if (typeof callback === 'function') {
                                callback(null, user);
                            } else {
                                that.adapter.log.warn('[getUserFromSocket] Invalid callback')
                            }
                        } else {
                            that.adapter.log.warn('Invalid password or user name: ' + user + ', ' + pass[0] + '***(' + pass.length + ')');
                            if (typeof callback === 'function') {
                                callback('unknown user');
                            } else {
                                that.adapter.log.warn('[getUserFromSocket] Invalid callback')
                            }
                        }
                    });
                }
            }
        } catch (e) {
            that.adapter.log.error(e);
            wait = false;
        }
        if (!wait && typeof callback === 'function') {
            callback('Cannot detect user');
        }
    }

    function disableEventThreshold(readAll) {
        if (eventsThreshold.active) {
            eventsThreshold.accidents = 0;
            eventsThreshold.count = 0;
            eventsThreshold.active = false;
            eventsThreshold.timeActivated = 0;
            that.adapter.log.info('Subscribe on all states again');

            /*setTimeout(function () {
                if (readAll) {
                    that.adapter.getForeignStates('*', function (err, res) {
                        that.adapter.log.info('received all states');
                        for (var id in res) {
                            if (res.hasOwnProperty(id) && JSON.stringify(states[id]) !== JSON.stringify(res[id])) {
                                that.server.sockets.emit('stateChange', id, res[id]);
                                states[id] = res[id];
                            }
                        }
                    });
                }

                that.server.sockets.emit('eventsThreshold', false);
                that.adapter.unsubscribeForeignStates('system.adapter.*');
                that.adapter.subscribeForeignStates('*');
            }, 50);*/

        }
    }

    function enableEventThreshold() {
        if (!eventsThreshold.active) {
            eventsThreshold.active = true;

            /*setTimeout(function () {
                that.adapter.log.info('Unsubscribe from all states, except system\'s, because over ' + eventsThreshold.repeatSeconds + ' seconds the number of events is over ' + eventsThreshold.value + ' (in last second ' + eventsThreshold.count + ')');
                eventsThreshold.timeActivated = new Date().getTime();

                that.server.sockets.emit('eventsThreshold', true);
                that.adapter.unsubscribeForeignStates('*');
                that.adapter.subscribeForeignStates('system.adapter.*');
            }, 100);*/
        }
    }

    function getClientAddress(socket) {
        var address;
        if (socket.handshake) {
            address = socket.handshake.address;
        }
        if (!address && socket.request && socket.request.connection) {
            address = socket.request.connection.remoteAddress;
        }
        return address;
    }

    this.initSocket = function (socket) {
        if (that.adapter.config.auth) {
            getUserFromSocket(socket, function (err, user) {
                if (err || !user) {
                    socket.emit('reauthenticate');
                    that.adapter.log.error('socket.io ' + err);
                    socket.disconnect();
                } else {
                    socket._secure = true;
                    that.adapter.log.debug('socket.io client ' + user + ' connected');
                    that.adapter.calculatePermissions('system.user.' + user, commandsPermissions, function (acl) {
                        var address = getClientAddress(socket);
                        // socket._acl = acl;
                        socket._acl = mergeACLs(address, acl, that.settings.whiteListSettings);
                        socketEvents(socket, address);
                    });
                }
            });
        } else {
            that.adapter.calculatePermissions(that.adapter.config.defaultUser, commandsPermissions, function (acl) {
                var address = getClientAddress(socket);
                // socket._acl = acl;
                socket._acl = mergeACLs(address, acl, that.settings.whiteListSettings);
                socketEvents(socket, address);
            });
        }
    };

    this.getWhiteListIpForAddress = function (address, whiteList){
        return getWhiteListIpForAddress(address, whiteList);
    };

    function getWhiteListIpForAddress(address, whiteList) {
        if (!whiteList) return null;

        // check IPv6 or IPv4 direct match
        if (whiteList.hasOwnProperty(address)) {
            return address;
        }

        // check if address is IPv4
        var addressParts = address.split('.');
        if (addressParts.length !== 4) {
            return null;
        }

        // do we have settings for wild carded ips?
        var wildCardIps = Object.keys(whiteList).filter(function (key) {
            return key.indexOf('*') !== -1;
        });


        if (wildCardIps.length === 0) {
            // no wild carded ips => no ip configured
            return null;
        }

        wildCardIps.forEach(function (ip) {
            var ipParts = ip.split('.');
            if (ipParts.length === 4) {
                for (var i = 0; i < 4; i++) {
                    if (ipParts[i] === '*' && i === 3) {
                        // match
                        return ip;
                    }

                    if (ipParts[i] !== addressParts[i]) break;
                }
            }
        });

        return null;
    }

    function getPermissionsForIp(address, whiteList) {
        return whiteList[getWhiteListIpForAddress(address, whiteList) || 'default'];
    }

    function mergeACLs(address, acl, whiteList) {
        if (whiteList && address) {
            var whiteListAcl = getPermissionsForIp(address, whiteList);
            if (whiteListAcl) {
                ['object', 'state', 'file'].forEach(function (key) {
                    if (acl.hasOwnProperty(key) && whiteListAcl.hasOwnProperty(key)) {
                        Object.keys(acl[key]).forEach(function (permission) {
                            if (whiteListAcl[key].hasOwnProperty(permission)) {
                                acl[key][permission] = acl[key][permission] && whiteListAcl[key][permission];
                            }
                        })
                    }
                });

                if (whiteListAcl.user !== 'auth') {
                    acl.user = 'system.user.' + whiteListAcl.user;
                }
            }
        }

        return acl;
    }

    function pattern2RegEx(pattern) {
        if (!pattern) {
            return null;
        }
        if (pattern !== '*') {
            if (pattern[0] === '*' && pattern[pattern.length - 1] !== '*') pattern += '$';
            if (pattern[0] !== '*' && pattern[pattern.length - 1] === '*') pattern = '^' + pattern;
        }
        pattern = pattern.replace(/\./g, '\\.');
        pattern = pattern.replace(/\*/g, '.*');
        pattern = pattern.replace(/\[/g, '\\[');
        pattern = pattern.replace(/]/g, '\\]');
        pattern = pattern.replace(/\(/g, '\\(');
        pattern = pattern.replace(/\)/g, '\\)');
        return pattern;
    }

    this.subscribe = function (socket, type, pattern) {
        //console.log((socket._name || socket.id) + ' subscribe ' + pattern);
        if (socket) {
            socket._subscribe = socket._subscribe || {};
        }
        if (!this.subscribes[type]) this.subscribes[type] = {};

        var s;
        if (socket) {
            s = socket._subscribe[type] = socket._subscribe[type] || [];
            for (var i = 0; i < s.length; i++) {
                if (s[i].pattern === pattern) return;
            }
        }

        var p = pattern2RegEx(pattern);
        if (p === null) {
            this.adapter.log.warn('Empty pattern!');
            return;
        }
        if (socket) {
            s.push({pattern: pattern, regex: new RegExp(p)});
        }

        if (this.subscribes[type][pattern] === undefined) {
            this.subscribes[type][pattern] = 1;
            if (type === 'stateChange') {
                this.adapter.subscribeForeignStates(pattern);
            } else if (type === 'objectChange') {
                if (this.adapter.subscribeForeignObjects) {
                    this.adapter.subscribeForeignObjects(pattern);
                }
            } else if (type === 'log') {
                if (this.adapter.requireLog) this.adapter.requireLog(true);
            }
        } else {
            this.subscribes[type][pattern]++;
        }
    };

    function showSubscribes(socket, type) {
        if (socket && socket._subscribe) {
            var s = socket._subscribe[type] || [];
            var ids = [];
            for (var i = 0; i < s.length; i++) {
                ids.push(s[i].pattern);
            }
            that.adapter.log.debug('Subscribes: ' + ids.join(', '));
        } else {
            that.adapter.log.debug('Subscribes: no subscribes');
        }
    }

    this.unsubscribe = function (socket, type, pattern) {
        //console.log((socket._name || socket.id) + ' unsubscribe ' + pattern);
        if (!this.subscribes[type]) this.subscribes[type] = {};

        if (socket) {
            if (!socket._subscribe || !socket._subscribe[type]) return;
            for (var i = socket._subscribe[type].length - 1; i >= 0; i--) {
                if (socket._subscribe[type][i].pattern === pattern) {

                    // Remove pattern from global list
                    if (this.subscribes[type][pattern] !== undefined) {
                        this.subscribes[type][pattern]--;
                        if (this.subscribes[type][pattern] <= 0) {
                            if (type === 'stateChange') {
                                //console.log((socket._name || socket.id) + ' unsubscribeForeignStates ' + pattern);
                                this.adapter.unsubscribeForeignStates(pattern);
                            } else if (type === 'objectChange') {
                                //console.log((socket._name || socket.id) + ' unsubscribeForeignObjects ' + pattern);
                                if (this.adapter.unsubscribeForeignObjects) this.adapter.unsubscribeForeignObjects(pattern);
                            } else if (type === 'log') {
                                //console.log((socket._name || socket.id) + ' requireLog false');
                                if (this.adapter.requireLog) this.adapter.requireLog(false);
                            }
                            delete this.subscribes[type][pattern];
                        }
                    }

                    delete socket._subscribe[type][i];
                    socket._subscribe[type].splice(i, 1);
                    return;
                }
            }
        } else if (pattern) {
            // Remove pattern from global list
            if (this.subscribes[type][pattern] !== undefined) {
                this.subscribes[type][pattern]--;
                if (this.subscribes[type][pattern] <= 0) {
                    if (type === 'stateChange') {
                        //console.log((socket._name || socket.id) + ' unsubscribeForeignStates ' + pattern);
                        this.adapter.unsubscribeForeignStates(pattern);
                    } else if (type === 'objectChange') {
                        //console.log((socket._name || socket.id) + ' unsubscribeForeignObjects ' + pattern);
                        if (this.adapter.unsubscribeForeignObjects) this.adapter.unsubscribeForeignObjects(pattern);
                    } else if (type === 'log') {
                        //console.log((socket._name || socket.id) + ' requireLog false');
                        if (this.adapter.requireLog) this.adapter.requireLog(false);
                    }
                    delete this.subscribes[type][pattern];
                }
            }
        } else {
            for (pattern in this.subscribes[type]) {
                if (!this.subscribes[type].hasOwnProperty(pattern)) continue;
                if (type === 'stateChange') {
                    //console.log((socket._name || socket.id) + ' unsubscribeForeignStates ' + pattern);
                    this.adapter.unsubscribeForeignStates(pattern);
                } else if (type === 'objectChange') {
                    //console.log((socket._name || socket.id) + ' unsubscribeForeignObjects ' + pattern);
                    if (this.adapter.unsubscribeForeignObjects) this.adapter.unsubscribeForeignObjects(pattern);
                } else if (type === 'log') {
                    //console.log((socket._name || socket.id) + ' requireLog false');
                    if (this.adapter.requireLog) this.adapter.requireLog(false);
                }
                delete this.subscribes[type][pattern];
            }
        }
    };

    this.unsubscribeAll = function () {
        if (this.server && this.server.sockets) {
            for (var s in this.server.sockets) {
                if (this.server.sockets.hasOwnProperty(s)) {
                    unsubscribeSocket(s, 'stateChange');
                    unsubscribeSocket(s, 'objectChange');
                    unsubscribeSocket(s, 'log');
                }
            }
        }
    };

    function unsubscribeSocket(socket, type) {
        if (!socket._subscribe || !socket._subscribe[type]) return;

        for (var i = 0; i < socket._subscribe[type].length; i++) {
            var pattern = socket._subscribe[type][i].pattern;
            if (that.subscribes[type][pattern] !== undefined) {
                that.subscribes[type][pattern]--;
                if (that.subscribes[type][pattern] <= 0) {
                    if (type === 'stateChange') {
                        that.adapter.unsubscribeForeignStates(pattern);
                    } else if (type === 'objectChange') {
                        if (that.adapter.unsubscribeForeignObjects) that.adapter.unsubscribeForeignObjects(pattern);
                    } else if (type === 'log') {
                        if (that.adapter.requireLog) that.adapter.requireLog(false);
                    }
                    delete that.subscribes[type][pattern];
                }
            }
        }
    }

    function subscribeSocket(socket, type) {
        //console.log((socket._name || socket.id) + ' subscribeSocket');
        if (!socket._subscribe || !socket._subscribe[type]) return;

        for (var i = 0; i < socket._subscribe[type].length; i++) {
            var pattern = socket._subscribe[type][i].pattern;
            if (that.subscribes[type][pattern] === undefined) {
                that.subscribes[type][pattern] = 1;
                if (type === 'stateChange') {
                    that.adapter.subscribeForeignStates(pattern);
                } else if (type === 'objectChange') {
                    if (that.adapter.subscribeForeignObjects) that.adapter.subscribeForeignObjects(pattern);
                } else if (type === 'log') {
                    if (that.adapter.requireLog) that.adapter.requireLog(true);
                }
            } else {
                that.subscribes[type][pattern]++;
            }
        }
    }

    function publish(socket, type, id, obj) {
        if (!socket._subscribe || !socket._subscribe[type]) return;
        var s = socket._subscribe[type];
        for (var i = 0; i < s.length; i++) {
            if (s[i].regex.test(id)) {
                updateSession(socket);
                socket.emit(type, id, obj);
                return;
            }
        }
    }

    // update session ID, but not offter than 60 seconds
    function updateSession(socket) {
        if (socket._sessionID) {
            var time = (new Date()).getTime();
            if (socket._lastActivity && time - socket._lastActivity > settings.ttl * 1000) {
                socket.emit('reauthenticate');
                socket.disconnect();
                return false;
            }
            socket._lastActivity = time;
            if (!socket._sessionTimer) {
                socket._sessionTimer = setTimeout(function () {
                    socket._sessionTimer = null;
                    that.settings.store.get(socket._sessionID, function (err, obj) {
                        if (obj) {
                            that.adapter.setSession(socket._sessionID, settings.ttl, obj);
                        } else {
                            socket.emit('reauthenticate');
                            socket.disconnect();
                        }
                    });
                }, 60000);
            }
        }
        return true;
    }

    // static information
    var commandsPermissions = {
        getObject:          {type: 'object',    operation: 'read'},
        getObjects:         {type: 'object',    operation: 'list'},
        getObjectView:      {type: 'object',    operation: 'list'},
        setObject:          {type: 'object',    operation: 'write'},
        requireLog:         {type: 'object',    operation: 'write'}, // just mapping to some command
        delObject:          {type: 'object',    operation: 'delete'},
        extendObject:       {type: 'object',    operation: 'write'},
        getHostByIp:        {type: 'object',    operation: 'list'},
        subscribeObjects:   {type: 'object',    operation: 'read'},
        unsubscribeObjects: {type: 'object',    operation: 'read'},

        getStates:          {type: 'state',     operation: 'list'},
        getState:           {type: 'state',     operation: 'read'},
        setState:           {type: 'state',     operation: 'write'},
        delState:           {type: 'state',     operation: 'delete'},
        createState:        {type: 'state',     operation: 'create'},
        subscribe:          {type: 'state',     operation: 'read'},
        unsubscribe:        {type: 'state',     operation: 'read'},
        getStateHistory:    {type: 'state',     operation: 'read'},
        getVersion:         {type: '',          operation: ''},

        addUser:            {type: 'users',     operation: 'create'},
        delUser:            {type: 'users',     operation: 'delete'},
        addGroup:           {type: 'users',     operation: 'create'},
        delGroup:           {type: 'users',     operation: 'delete'},
        changePassword:     {type: 'users',     operation: 'write'},

        httpGet:            {type: 'other',     operation: 'http'},
        cmdExec:            {type: 'other',     operation: 'execute'},
        sendTo:             {type: 'other',     operation: 'sendto'},
        sendToHost:         {type: 'other',     operation: 'sendto'},
        readLogs:           {type: 'other',     operation: 'execute'},

        createFile:         {type: 'file',      operation: 'create'},
        writeFile:          {type: 'file',      operation: 'write'},
        readFile:           {type: 'file',      operation: 'read'},
        deleteFile:         {type: 'file',      operation: 'delete'},
        readFile64:         {type: 'file',      operation: 'read'},
        writeFile64:        {type: 'file',      operation: 'write'},
        unlink:             {type: 'file',      operation: 'delete'},
        rename:             {type: 'file',      operation: 'write'},
        mkdir:              {type: 'file',      operation: 'write'},
        readDir:            {type: 'file',      operation: 'list'},
        chmodFile:          {type: 'file',      operation: 'write'},

        authEnabled:        {type: '',          operation: ''},
        disconnect:         {type: '',          operation: ''},
        listPermissions:    {type: '',          operation: ''},
        getUserPermissions: {type: 'object',    operation: 'read'}
    };

    function addUser(user, pw, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = null;
        }

        if (!user.match(/^[-.A-Za-züäößÖÄÜа-яА-Я@+$§0-9=?!&# ]+$/)) {
            if (typeof callback === 'function') {
                callback('Invalid characters in the name. Only following special characters are allowed: -@+$§=?!&# and letters');
            }
            return;
        }

        that.adapter.getForeignObject('system.user.' + user, options, function (err, obj) {
            if (obj) {
                if (typeof callback === 'function') {
                    callback('User yet exists');
                }
            } else {
                that.adapter.setForeignObject('system.user.' + user, {
                    type: 'user',
                    common: {
                        name: user,
                        enabled: true,
                        groups: []
                    }
                }, options, function () {
                    that.adapter.setPassword(user, pw, callback);
                });
            }
        });
    }

    function delUser(user, options, callback) {
        that.adapter.getForeignObject('system.user.' + user, options, function (err, obj) {
            if (err || !obj) {
                if (typeof callback === 'function') {
                    callback('User does not exist');
                }
            } else {
                if (obj.common.dontDelete) {
                    if (typeof callback === 'function') {
                        callback('Cannot delete user, while is system user');
                    }
                } else {
                    that.adapter.delForeignObject('system.user.' + user, options, function (err) {
                        // Remove this user from all groups in web client
                        if (typeof callback === 'function') {
                            callback(err);
                        }
                    });
                }
            }
        });
    }

    function addGroup(group, desc, acl, options, callback) {
        var name = group;
        if (typeof acl === 'function') {
            callback = acl;
            acl = null;
        }
        if (typeof desc === 'function') {
            callback = desc;
            desc = null;
        }
        if (typeof options === 'function') {
            callback = options;
            options = null;
        }
        if (name && name.substring(0, 1) !== name.substring(0, 1).toUpperCase()) {
            name = name.substring(0, 1).toUpperCase() + name.substring(1);
        }
        group = group.substring(0, 1).toLowerCase() + group.substring(1);

        if (!group.match(/^[-.A-Za-züäößÖÄÜа-яА-Я@+$§0-9=?!&#_ ]+$/)) {
            if (typeof callback === 'function') {
                callback('Invalid characters in the group name. Only following special characters are allowed: -@+$§=?!&# and letters');
            }
            return;
        }

        that.adapter.getForeignObject('system.group.' + group, options, function (err, obj) {
            if (obj) {
                if (typeof callback === 'function') {
                    callback('Group yet exists');
                }
            } else {
                obj = {
                    _id:  'system.group.' + group,
                    type: 'group',
                    common: {
                        name: name,
                        desc: desc,
                        members: [],
                        acl: acl
                    }
                };
                that.adapter.setForeignObject('system.group.' + group, obj, options, function (err) {
                    if (typeof callback === 'function') {
                        callback(err, obj);
                    }
                });
            }
        });
    }

    function delGroup(group, options, callback) {
        that.adapter.getForeignObject('system.group.' + group, options, function (err, obj) {
            if (err || !obj) {
                if (typeof callback === 'function') {
                    callback('Group does not exist');
                }
            } else {
                if (obj.common.dontDelete) {
                    if (typeof callback === 'function') {
                        callback('Cannot delete group, while is system group');
                    }
                } else {
                    that.adapter.delForeignObject('system.group.' + group, options, function (err) {
                        // Remove this group from all users in web client
                        if (typeof callback === 'function') {
                            callback(err);
                        }
                    });
                }
            }
        });
    }

    function checkPermissions(socket, command, callback, arg) {
        if (socket._acl.user !== 'system.user.admin') {
            // type: file, object, state, other
            // operation: create, read, write, list, delete, sendto, execute, sendToHost, readLogs
            if (commandsPermissions[command]) {
                // If permission required
                if (commandsPermissions[command].type) {
                    if (socket._acl[commandsPermissions[command].type] &&
                        socket._acl[commandsPermissions[command].type][commandsPermissions[command].operation]) {
                        return true;
                    } else {
                        that.adapter.log.warn('No permission for "' + socket._acl.user + '" to call ' + command + '. Need "' + commandsPermissions[command].type + '"."' + commandsPermissions[command].operation + '"');
                    }
                } else {
                    return true;
                }
            } else {
                that.adapter.log.warn('No rule for command: ' + command);
            }

            if (typeof callback === 'function') {
                callback('permissionError');
            } else {
                if (commandsPermissions[command]) {
                    socket.emit('permissionError', {
                        command: command,
                        type: commandsPermissions[command].type,
                        operation: commandsPermissions[command].operation,
                        arg: arg
                    });
                } else {
                    socket.emit('permissionError', {
                        command: command,
                        arg: arg
                    });
                }
            }
            return false;
        } else {
            return true;
        }
    }

    function checkObject(obj, options, flag) {
        // read rights of object
        if (!obj || !obj.common || !obj.acl || flag === 'list') {
            return true;
        }

        if (options.user !== 'system.user.admin' &&
            options.groups.indexOf('system.group.administrator') === -1) {
            if (obj.acl.owner !== options.user) {
                // Check if the user is in the group
                if (options.groups.indexOf(obj.acl.ownerGroup) !== -1) {
                    // Check group rights
                    if (!(obj.acl.object & (flag << 4))) {
                        return false
                    }
                } else {
                    // everybody
                    if (!(obj.acl.object & flag)) {
                        return false
                    }
                }
            } else {
                // Check group rights
                if (!(obj.acl.object & (flag << 8))) {
                    return false
                }
            }
        }
        return true;
    }

    this.send = function (socket, cmd, id, data) {
        if (socket._apiKeyOk) {
            socket.emit(cmd, id, data);
        }
    };

    function stopAdapter(data, callback) {
        that.adapter.log.warn('Adapter stopped. Reason: ' + (data && data.reason ? data.reason : 'command from server'));

        that.emit && that.emit('cloudStop');
    }

    function redirectAdapter(data) {
        that.emit && that.emit('cloudRedirect', data);
    }

    function waitForConnect(data) {
        that.emit && that.emit('connectWait', data ? data.delaySeconds || 30 : 30);
    }

    function socketEvents(socket, address) {
        if (socket.conn) {
            that.adapter.log.info('Connected ' + socket._acl.user + ' from ' + address);
        } else {
            that.adapter.log.info('Trying to connect as ' + socket._acl.user + (address ? ' from ' + address : ''));
        }

        if (!that.infoTimeout) {
            that.infoTimeout = setTimeout(updateConnectedInfo, 1000);
        }

        socket.on('authenticate', function (user, pass, callback) {
            that.adapter.log.debug((new Date()).toISOString() + ' Request authenticate [' + socket._acl.user + ']');
            if (typeof user === 'function') {
                callback = user;
                user = undefined;
            }
            if (socket._acl.user !== null) {
                if (typeof callback === 'function') {
                    callback(socket._acl.user !== null, socket._secure);
                }
            } else {
                that.adapter.log.debug((new Date()).toISOString() + ' Request authenticate [' + socket._acl.user + ']');
                socket._authPending = callback;
            }
        });

        socket.on('name', function (name) {
            updateSession(socket);
            if (this._name === undefined) {
                this._name = name;
                if (!that.infoTimeout) that.infoTimeout = setTimeout(updateConnectedInfo, 1000);
            } else if (this._name !== name) {
                that.adapter.log.debug('socket ' + this.id + ' changed socket name from ' + this._name + ' to ' + name);
                this._name = name;
            }
        });

        /*
         *      objects
         */
        socket.on('getObject', function (id, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'getObject', callback, id)) {
                that.adapter.getForeignObject(id, callback);
            }
        });

        socket.on('getObjects', function (callback) {
            if (updateSession(socket) && checkPermissions(socket, 'getObjects', callback)) {
                that.adapter.getForeignObjects('*', 'state', 'rooms', function (err, objs) {
                    if (typeof callback === 'function') {
                        callback(err, objs);
                    } else {
                        that.adapter.log.warn('[getObjects] Invalid callback')
                    }
                });
            }
        });

        socket.on('subscribeObjects', function (pattern, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'subscribeObjects', callback, pattern)) {
                if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                    for (var p = 0; p < pattern.length; p++) {
                        that.subscribe(this, 'objectChange', pattern[p]);
                    }
                } else {
                    that.subscribe(this, 'objectChange', pattern);
                }
                if (typeof callback === 'function') {
                    setImmediate(callback, null);
                }
            }
        });

        socket.on('unsubscribeObjects', function (pattern, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'unsubscribeObjects', callback, pattern)) {
                if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                    for (var p = 0; p < pattern.length; p++) {
                        that.unsubscribe(this, 'objectChange', pattern[p]);
                    }
                } else {
                    that.unsubscribe(this, 'objectChange', pattern);
                }
                if (typeof callback === 'function') {
                    setImmediate(callback, null);
                }
            }
        });

        socket.on('getObjectView', function (design, search, params, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'getObjectView', callback, search)) {
                that.adapter.objects.getObjectView(design, search, params, callback);
            }
        });

        socket.on('setObject', function (id, obj, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'setObject', callback, id)) {
                that.adapter.setForeignObject(id, obj, callback);
            }
        });

        /*
         *      states
         */
        socket.on('getStates', function (pattern, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'getStates', callback, pattern)) {
                if (typeof pattern === 'function') {
                    callback = pattern;
                    pattern = null;
                }
                that.adapter.getForeignStates(pattern || '*', {user: socket._acl.user}, callback);
            }
        });

        socket.on('error', function (err) {
            that.adapter.log.error('Socket error: ' + err);
        });

        // allow admin access
        if (that.settings.allowAdmin) {
            socket.on('getAllObjects', function (callback) {
                if (updateSession(socket) && checkPermissions(socket, 'getObjects', callback)) {
                    that.adapter.objects.getObjectList({include_docs: true}, function (err, res) {
                        that.adapter.log.info('received all objects');
                        res = res.rows;
                        var objects = {};

                        if (socket._acl &&
                            socket._acl.user !== 'system.user.admin' &&
                            socket._acl.groups.indexOf('system.group.administrator') === -1) {
                            for (var i = 0; i < res.length; i++) {
                                if (checkObject(res[i].doc, socket._acl, 4 /* 'read' */)) {
                                    objects[res[i].doc._id] = res[i].doc;
                                }
                            }
                            if (typeof callback === 'function') {
                                callback(null, objects);
                            } else {
                                that.adapter.log.warn('[getAllObjects] Invalid callback')
                            }
                        } else {
                            for (var j = 0; j < res.length; j++) {
                                objects[res[j].doc._id] = res[j].doc;
                            }
                            if (typeof callback === 'function') {
                                callback(null, objects);
                            } else {
                                that.adapter.log.warn('[getAllObjects] Invalid callback')
                            }
                        }
                    });
                }
            });

            socket.on('delObject', function (id, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'delObject', callback, id)) {
                    that.adapter.delForeignObject(id, {user: socket._acl.user}, callback);
                }
            });

            socket.on('extendObject', function (id, obj, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'extendObject', callback, id)) {
                    that.adapter.extendForeignObject(id, obj, {user: socket._acl.user}, callback);
                }
            });

            socket.on('getHostByIp', function (ip, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'getHostByIp', ip)) {
                    that.adapter.objects.getObjectView('system', 'host', {}, {user: socket._acl.user}, function (err, data) {
                        if (data.rows.length) {
                            for (var i = 0; i < data.rows.length; i++) {
                                if (data.rows[i].value.common.hostname === ip) {
                                    if (typeof callback === 'function') {
                                        callback(ip, data.rows[i].value);
                                    } else {
                                        that.adapter.log.warn('[getHostByIp] Invalid callback')
                                    }
                                    return;
                                }
                                if (data.rows[i].value.native.hardware && data.rows[i].value.native.hardware.networkInterfaces) {
                                    var net = data.rows[i].value.native.hardware.networkInterfaces;
                                    for (var eth in net) {
                                        if (!net.hasOwnProperty(eth)) continue;
                                        for (var j = 0; j < net[eth].length; j++) {
                                            if (net[eth][j].address === ip) {
                                                if (typeof callback === 'function') {
                                                    callback(ip, data.rows[i].value);
                                                } else {
                                                    that.adapter.log.warn('[getHostByIp] Invalid callback')
                                                }
                                                return;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (typeof callback === 'function') {
                            callback(ip, null);
                        } else {
                            that.adapter.log.warn('[getHostByIp] Invalid callback')
                        }
                    });
                }
            });

            socket.on('getForeignObjects', function (pattern, type, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'getObjects', callback)) {
                    if (typeof type === 'function') {
                        callback = type;
                        type = undefined;
                    }

                    that.adapter.getForeignObjects(pattern, type, function (err, objs) {
                        if (typeof callback === 'function') {
                            callback(err, objs);
                        } else {
                            that.adapter.log.warn('[getObjects] Invalid callback')
                        }
                    });
                }
            });

            socket.on('getForeignStates', function (pattern, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'getStates', callback)) {
                    that.adapter.getForeignStates(pattern, function (err, objs) {
                        if (typeof callback === 'function') {
                            callback(err, objs);
                        } else {
                            that.adapter.log.warn('[getObjects] Invalid callback')
                        }
                    });
                }
            });

            socket.on('requireLog', function (isEnabled, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'setObject', callback)) {
                    if (isEnabled) {
                        that.subscribe(this, 'log', 'dummy')
                    } else {
                        that.unsubscribe(this, 'log', 'dummy')
                    }
                    if (that.adapter.log.level === 'debug') showSubscribes(socket, 'log');

                    if (typeof callback === 'function') {
                        setImmediate(callback, null);
                    }
                }
            });

            socket.on('readLogs', function (callback) {
                if (updateSession(socket) && checkPermissions(socket, 'readLogs', callback)) {
                    var result = {list: []};

                    // deliver file list
                    try {
                        var config = adapter.systemConfig;
                        // detect file log
                        if (config && config.log && config.log.transport) {
                            for (var transport in config.log.transport) {
                                if (config.log.transport.hasOwnProperty(transport) && config.log.transport[transport].type === 'file') {
                                    var filename = config.log.transport[transport].filename || 'log/';
                                    var parts = filename.replace(/\\/g, '/').split('/');
                                    parts.pop();
                                    filename = parts.join('/');
                                    if (filename[0] === '.') {
                                        filename = path.normalize(__dirname + '/../../../') + filename;
                                    }
                                    if (fs.existsSync(filename)) {
                                        var files = fs.readdirSync(filename);
                                        for (var f = 0; f < files.length; f++) {
                                            try {
                                                if (!fs.lstatSync(filename + '/' + files[f]).isDirectory()) {
                                                    result.list.push('log/' + transport + '/' + files[f]);
                                                }
                                            } catch (e) {
                                                // push unchecked
                                                // result.list.push('log/' + transport + '/' + files[f]);
                                                adapter.log.error('Cannot check file: ' + filename + '/' + files[f]);
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            result.error = 'no file loggers';
                            result.list = undefined;
                        }
                    } catch (e) {
                        adapter.log.error(e);
                        result.error = e;
                        result.list = undefined;
                    }
                    if (typeof callback === 'function') {
                        callback(result.error, result.list);
                    }
                }
            });
        } else {
            // only flot allowed
            socket.on('delObject', function (id, callback) {
                if (id.match(/^flot\./)) {
                    if (updateSession(socket) && checkPermissions(socket, 'delObject', callback, id)) {
                        that.adapter.delForeignObject(id, {user: socket._acl.user}, callback);
                    }
                } else {
                    if (typeof callback === 'function') {
                        callback('permissionError');
                    }
                }
            });

            // inform user about problem
            socket.on('getAllObjects', function (callback) {
                if (updateSession(socket) && checkPermissions(socket, 'getObjects', callback)) {
                    if (typeof callback === 'function') {
                        callback('Admin is not enabled in cloud settings!');
                    }
                }
            });
        }

        socket.on('getState', function (id, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'getState', callback, id)) {
                that.adapter.getForeignState(id, {user: socket._acl.user}, callback);
            }
        });

        socket.on('setState', function (id, state, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'setState', callback, id)) {
                if (typeof state !== 'object') state = {val: state};
                that.adapter.setForeignState(id, state, {user: socket._acl.user}, function (err, res) {
                    if (typeof callback === 'function') {
                        callback(err, res);
                    }
                });
            }
        });

        // allow admin access
        if (that.settings.allowAdmin) {
            socket.on('delState', function (id, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'delState', callback, id)) {
                    that.adapter.delForeignState(id, {user: socket._acl.user}, callback);
                }
            });
            socket.on('addUser', function (user, pass, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'addUser', callback, user)) {
                    addUser(user, pass, {user: socket._acl.user}, callback);
                }
            });

            socket.on('delUser', function (user, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'delUser', callback, user)) {
                    delUser(user, {user: socket._acl.user}, callback);
                }
            });

            socket.on('addGroup', function (group, desc, acl, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'addGroup', callback, group)) {
                    addGroup(group, desc, acl, {user: socket._acl.user}, callback);
                }
            });

            socket.on('delGroup', function (group, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'delGroup', callback, group)) {
                    delGroup(group, {user: socket._acl.user}, callback);
                }
            });

            socket.on('changePassword', function (user, pass, callback) {
                if (updateSession(socket)) {
                    if (user === socket._acl.user || checkPermissions(socket, 'changePassword', callback, user)) {
                        that.adapter.setPassword(user, pass, {user: socket._acl.user}, callback);
                    }
                }
            });
            // commands will be executed on host/controller
            // following response commands are expected: cmdStdout, cmdStderr, cmdExit
            socket.on('cmdExec', function (host, id, cmd, callback) {
                if (updateSession(socket) && checkPermissions(socket, 'cmdExec', callback, cmd)) {
                    that.adapter.log.debug('cmdExec on ' + host + '(' + id + '): ' + cmd);
                    that.adapter.sendToHost(host, 'cmdExec', {data: cmd, id: id});
                }
            });

            socket.on('eventsThreshold', function (isActive) {
                if (!isActive) {
                    disableEventThreshold(true);
                } else {
                    enableEventThreshold();
                }
            });
        }

        socket.on('getVersion', function (callback) {
            if (updateSession(socket) && checkPermissions(socket, 'getVersion', callback)) {
                if (typeof callback === 'function') {
                    callback(that.adapter.version);
                } else {
                    that.adapter.log.warn('[getVersion] Invalid callback')
                }
            }
        });

        socket.on('subscribe', function (pattern, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'subscribe', callback, pattern)) {
                if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                    for (var p = 0; p < pattern.length; p++) {
                        that.subscribe(this, 'stateChange', pattern[p]);
                    }
                } else {
                    that.subscribe(this, 'stateChange', pattern);
                }
                if (that.adapter.log.level === 'debug') showSubscribes(socket, 'stateChange');
                if (typeof callback === 'function') {
                    setImmediate(callback, null);
                }
            }
        });

        socket.on('unsubscribe', function (pattern, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'unsubscribe', callback, pattern)) {
                if (pattern && typeof pattern === 'object' && pattern instanceof Array) {
                    for (var p = 0; p < pattern.length; p++) {
                        that.unsubscribe(this, 'stateChange', pattern[p]);
                    }
                } else {
                    that.unsubscribe(this, 'stateChange', pattern);
                }
                if (that.adapter.log.level === 'debug') showSubscribes(socket, 'stateChange');
                if (typeof callback === 'function') {
                    setImmediate(callback, null);
                }
            }
        });

        /*
         *      History
         */
        socket.on('getStateHistory', function (id, start, end, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'getStateHistory', callback, id)) {
                that.adapter.getForeignStateHistory(id, start, end, callback);
            }
        });

        // new History
        socket.on('getHistory', function (id,options, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'getStateHistory', callback, id)) {
                that.adapter.getHistory(id, options, function (err, data, step, sessionId) {
                    if (typeof callback === 'function') {
                        callback(err, data, step, sessionId);
                    } else {
                        that.adapter.log.warn('[getHistory] Invalid callback')
                    }
                });
            }
        });

        // HTTP
        socket.on('httpGet', function (url, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'httpGet', callback, url)) {
                if (!request) request = require('request');
                that.adapter.log.debug('httpGet: ' + url);
                request(url, callback);
            }
        });

        // commands
        socket.on('sendTo', function (adapterInstance, command, message, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'sendTo', callback, command)) {
                that.adapter.sendTo(adapterInstance, command, message, callback);
            }
        });

        // following commands are protected and require the extra permissions
        var protectedCommands = ['cmdExec', 'getLocationOnDisk', 'getDiagData', 'getDevList', 'delLogs', 'writeDirAsZip', 'writeObjectsAsZip', 'readObjectsAsZip', 'checkLogging', 'updateMultihost'];

        socket.on('sendToHost', function (host, command, message, callback) {
            // host can answer following commands: cmdExec, getRepository, getInstalled, getInstalledAdapter, getVersion, getDiagData, getLocationOnDisk, getDevList, getLogs, getHostInfo,
            // delLogs, readDirAsZip, writeDirAsZip, readObjectsAsZip, writeObjectsAsZip, checkLogging, updateMultihost
            if (updateSession(socket) && checkPermissions(socket, protectedCommands.indexOf(command) !== -1 ? 'cmdExec' : 'sendToHost', callback, command)) {
                that.adapter.sendToHost(host, command, message, callback);
            }
        });

        socket.on('authEnabled', function (callback) {
            if (updateSession(socket) && checkPermissions(socket, 'authEnabled', callback)) {
                // that.settings.auth ??
                if (typeof callback === 'function') {
                    callback(that.adapter.config.auth, socket._acl.user.replace(/^system\.user\./, ''));
                } else {
                    that.adapter.log.warn('[authEnabled] Invalid callback')
                }
            }
        });

        // file operations
        socket.on('readFile', function (_adapter, fileName, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'readFile', callback, fileName)) {
                that.adapter.readFile(_adapter, fileName, {user: socket._acl.user}, callback);
            }
        });

        socket.on('readFile64', function (_adapter, fileName, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'readFile64', callback, fileName)) {
                that.adapter.readFile(_adapter, fileName, {user: socket._acl.user}, function (err, buffer, type) {
                    var data64;
                    if (buffer) {
                        if (type === 'application/json') {
                            data64 = new Buffer(encodeURIComponent(buffer)).toString('base64');
                        } else {
                            if (typeof buffer === 'string') {
                                data64 = new Buffer(buffer).toString('base64');
                            } else {
                                data64 = buffer.toString('base64');
                            }
                        }
                    }

                    //Convert buffer to base 64
                    if (typeof callback === 'function') {
                        callback(err, data64 || '', type);
                    } else {
                        that.adapter.log.warn('[readFile64] Invalid callback')
                    }
                });
            }
        });

        socket.on('writeFile64', function (_adapter, fileName, data64, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {user: socket._acl.user};
            }
            if (!options) options = {};
            options.user = socket._acl.user;

            if (updateSession(socket) && checkPermissions(socket, 'writeFile64', callback, fileName)) {
                //Convert base 64 to buffer
                var buffer = new Buffer(data64, 'base64');
                that.adapter.writeFile(_adapter, fileName, buffer, options, function (err) {
                    if (typeof callback === 'function') {
                        callback(err);
                    }
                });
            }
        });

        socket.on('writeFile', function (_adapter, fileName, data, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {user: socket._acl.user};
            }
            if (!options) options = {};
            options.user = socket._acl.user;
            if (updateSession(socket) && checkPermissions(socket, 'writeFile', callback, fileName)) {
                that.adapter.writeFile(_adapter, fileName, data, options, callback);
            }
        });

        socket.on('unlink', function (_adapter, name, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'unlink', callback, name)) {
                that.adapter.unlink(_adapter, name, {user: socket._acl.user}, callback);
            }
        });

        socket.on('rename', function (_adapter, oldName, newName, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'rename', callback, oldName)) {
                that.adapter.rename(_adapter, oldName, newName, {user: socket._acl.user}, callback);
            }
        });

        socket.on('mkdir', function (_adapter, dirName, callback) {
            if (updateSession(socket) && checkPermissions(socket, 'mkdir', callback, dirName)) {
                that.adapter.mkdir(_adapter, dirName, {user: socket._acl.user}, callback);
            }
        });

        socket.on('readDir', function (_adapter, dirName, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            options = options || {};
            options.user = socket._acl.user;

            if (options.filter === undefined) options.filter = true;

            if (updateSession(socket) && checkPermissions(socket, 'readDir', callback, dirName)) {
                that.adapter.readDir(_adapter, dirName, options, callback);
            }
        });

        socket.on('chmodFile', function (_adapter, dirName, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            options = options || {};
            options.user = socket._acl.user;

            if (options.filter === undefined) options.filter = true;

            if (updateSession(socket) && checkPermissions(socket, 'chmodFile', callback, dirName)) {
                that.adapter.chmodFile(_adapter, dirName, options, callback);
            }
        });

        // connect/disconnect
        socket.on('disconnect', function (error) {
            unsubscribeSocket(this, 'stateChange');
            unsubscribeSocket(this, 'objectChange');
            unsubscribeSocket(this, 'log');
            if (!that.infoTimeout) that.infoTimeout = setTimeout(updateConnectedInfo, 1000);

            // if client mode
            if (!socket.conn) {
                socket._apiKeyOk = false;
                that.emit && that.emit('disconnect', error);
            }
        });

        socket.on('logout', function (callback) {
            that.adapter.destroySession(socket._sessionID, callback);
        });

        socket.on('listPermissions', function (callback) {
            if (updateSession(socket)) {
                if (typeof callback === 'function') {
                    callback(commandsPermissions);
                } else {
                    that.adapter.log.warn('[listPermissions] Invalid callback');
                }
            }
        });

        socket.on('getUserPermissions', function (callback) {
            if (updateSession(socket) && checkPermissions(socket, 'getUserPermissions', callback)) {
                if (typeof callback === 'function') {
                    callback(null, socket._acl);
                } else {
                    that.adapter.log.warn('[getUserPermissions] Invalid callback')
                }
            }
        });

        if (typeof that.settings.extensions === 'function') {
            that.settings.extensions(socket);
        }

        // if client mode
        if (!socket.conn) {
            socket._apiKeyOk = false;

            socket.on('cloudDisconnect', function (err) {
                err && that.adapter.log.warn('User disconnected from cloud: ' + err);
                unsubscribeSocket(socket, 'stateChange');
                unsubscribeSocket(socket, 'objectChange');
                unsubscribeSocket(socket, 'log');
                that.emit('cloudDisconnect');
            });

            socket.on('cloudConnect', function () {
                // do not autosubscribe. The client must resubscribe all states anew
                // subscribeSocket(socket, 'stateChange');
                // subscribeSocket(socket, 'objectChange');
                // subscribeSocket(socket, 'log');
                that.emit('cloudConnect');
            });

            socket.on('cloudCommand', function (cmd, data) {
                if (cmd === 'stop') {
                    stopAdapter(data);
                } else if (cmd === 'redirect') {
                    redirectAdapter(data);
                } else if (cmd === 'wait') {
                    waitForConnect(data);
                } else {
                    that.adapter.log.warn('Received unknown command "' + cmd + '" from server');
                }
            });

            // only active in client mode
            socket.on('connect', function () {
                that.adapter.log.debug('Connected. Check api key...');
                socket._apiKeyOk = false;

                // 2018_01_20 workaround for pro: Remove it after next pro maintenance
                if (that.settings.apikey.indexOf('@pro_') !== -1) {
                    socket._apiKeyOk = true;
                    that.emit && that.emit('connect');
                }

                // send api key if exists
                this.emit('apikey', that.settings.apikey, that.settings.version, that.settings.uuid, function (err, instructions) {
                    // instructions = {
                    //     validTill: '2018-03-14T01:01:01.567Z',
                    //     command: 'wait' | 'stop' | 'redirect'
                    //     delaySeconds: seconds for wait
                    //     reason: Description of command
                    //     url: redirect URL
                    //     notSave: true | false for url. Save it or just use it

                    if (instructions) {
                        if (typeof instructions !== 'object') {
                            that.adapter.setState('info.remoteTill', new Date(instructions).toISOString(), true);
                        } else {
                            if (instructions.validTill) {
                                that.adapter.setState('info.remoteTill', new Date(instructions.validTill).toISOString(), true);
                            }
                            if (instructions.command === 'stop') {
                                stopAdapter(instructions);
                                return;
                            } else if (instructions.command === 'redirect') {
                                redirectAdapter(instructions);
                                return;
                            } else if (instructions.command === 'wait') {
                                waitForConnect(instructions);
                                return;
                            }
                        }
                    }

                    if (!err) {
                        that.adapter.log.debug('API KEY OK');
                        socket._apiKeyOk = true;

                        that.emit && that.emit('connect');
                    } else {
                        if (err.indexOf('Please buy remote access to use pro.') !== -1) {
                            stopAdapter('Please buy remote access to use pro.');
                        }
                        that.adapter.log.error(err);
                        this.close(); // disconnect
                    }
                });

                if (socket._sessionID) {
                    that.adapter.getSession(socket._sessionID, function (obj) {
                        if (obj && obj.passport) {
                            socket._acl.user = obj.passport.user;
                        } else {
                            socket._acl.user = '';
                            socket.emit('reauthenticate');
                            socket.disconnect();
                        }
                        if (socket._authPending) {
                            socket._authPending(!!socket._acl.user, true);
                            delete socket._authPending;
                        }
                    });
                }

                subscribeSocket(this, 'stateChange');
                subscribeSocket(this, 'objectChange');
                subscribeSocket(this, 'log');
            });

            /*socket.on('reconnect', function (attempt) {
                that.adapter.log.debug('Connected after attempt ' + attempt);
            });
            socket.on('reconnect_attempt', function (attempt) {
                that.adapter.log.debug('reconnect_attempt');
            });
            socket.on('connect_error', function (error) {
                that.adapter.log.debug('connect_error: ' + error);
            });
            socket.on('connect_timeout', function (error) {
                that.adapter.log.debug('connect_timeout');
            });
            socket.on('reconnect_failed', function (error) {
                that.adapter.log.debug('reconnect_failed');
            });*/
        } else {
            // if server mode
            if (socket.conn.request.sessionID) {
                socket._secure    = true;
                socket._sessionID = socket.conn.request.sessionID;
                // Get user for session
                that.settings.store.get(socket.conn.request.sessionID, function (err, obj) {
                    if (!obj || !obj.passport) {
                        socket._acl.user = '';
                        socket.emit('reauthenticate');
                        socket.disconnect();
                    }
                    if (socket._authPending) {
                        socket._authPending(!!socket._acl.user, true);
                        delete socket._authPending;
                    }
                });
            }

            subscribeSocket(socket, 'stateChange');
            subscribeSocket(socket, 'objectChange');
            subscribeSocket(socket, 'log');
        }
    }

    function updateConnectedInfo() {
        if (that.infoTimeout) {
            clearTimeout(that.infoTimeout);
            that.infoTimeout = null;
        }
        if (that.server.sockets) {
            var text = '';
            var cnt = 0;
            if (that.server) {
                var clients = that.server.sockets.connected;

                for (var i in clients) {
                    if (clients.hasOwnProperty(i)) {
                        text += (text ? ', ' : '') + (clients[i]._name || 'noname');
                        cnt++;
                    }
                }
            }
            text = '[' + cnt + ']' + text;
            that.adapter.setState('connected', text, true);
        }
    }

    this.publishAll = function (type, id, obj) {
        if (id === undefined) {
            console.log('Problem');
        }

        var clients = this.server.sockets.connected;

        for (var i in clients) {
            if (clients.hasOwnProperty(i)) {
                publish(clients[i], type, id, obj);
            }
        }
    };

    this.sendLog = function (obj) {
        // TODO Build in some threshold
        if (this.server && this.server.sockets) {
            this.server.sockets.emit('log', obj);
        }
    };

    (function __constructor() {

        if (that.settings.allowAdmin) {
            // detect event bursts
            setInterval(function () {
                if (!eventsThreshold.active) {
                    if (eventsThreshold.count > eventsThreshold.value) {
                        eventsThreshold.accidents++;

                        if (eventsThreshold.accidents >= eventsThreshold.repeatSeconds) {
                            enableEventThreshold();
                        }
                    } else {
                        eventsThreshold.accidents = 0;
                    }
                    eventsThreshold.count = 0;
                } else if (new Date().getTime() - eventsThreshold.timeActivated > 60000) {
                    disableEventThreshold();
                }
            }, eventsThreshold.checkInterval);
        }

        // it can be used as client too for cloud
        if (!that.settings.apikey) {
            if (!that.webServer.__inited) {
                that.server = socketio.listen(that.webServer);
                that.webServer.__inited = true;
            }

            // force using only websockets
            if (that.settings.forceWebSockets) that.server.set('transports', ['websocket']);
        } else {
            that.server = server;
        }

        //    socket = socketio.listen(settings.port, (settings.bind && settings.bind !== "0.0.0.0") ? settings.bind : undefined);
        that.adapter.config.defaultUser = that.adapter.config.defaultUser || 'system.user.admin';
        if (!that.adapter.config.defaultUser.match(/^system\.user\./)) that.adapter.config.defaultUser = 'system.user.' + that.adapter.config.defaultUser;

        if (that.settings.auth && that.server) {
            that.server.use(function (socket, next) {
                if (!socket.request._query.user || !socket.request._query.pass) {
                    that.adapter.log.warn('No password or username!');
                    next(new Error('Authentication error'));
                } else {
                    that.adapter.checkPassword(socket.request._query.user, socket.request._query.pass, function (res) {
                        if (res) {
                            that.adapter.log.debug('Logged in: ' + socket.request._query.user + ', ' + socket.request._query.pass);
                            next();
                        } else {
                            that.adapter.log.warn('Invalid password or user name: ' + socket.request._query.user + ', ' + socket.request._query.pass);
                            socket.emit('reauthenticate');
                            next(new Error('Invalid password or user name'));
                        }
                    });
                }
            });
        }

        // Enable cross domain access
        if (that.settings.crossDomain && that.server.set) {
            that.server.set('origins', '*:*');
        }

        that.settings.ttl = that.settings.ttl || 3600;

        that.server.on('connection', that.initSocket);

        if (settings.port) {
            that.adapter.log.info((settings.secure ? 'Secure ' : '') + 'socket.io server listening on port ' + settings.port);
        }

        if (!that.infoTimeout) that.infoTimeout = setTimeout(updateConnectedInfo, 1000);

        // if client mode => add event handlers
        if (that.settings.apikey) {
            that.initSocket(that.server);
        }
    })();
}

util.inherits(IOSocket, EventEmitter);

module.exports = IOSocket;
