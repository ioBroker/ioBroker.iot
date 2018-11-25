'use strict';

// Possible device types:


// Possible traits:
// - action.devices.traits.TemperatureSetting
// - action.devices.traits.OnOff
// - action.devices.traits.Toggles
// - action.devices.traits.Brightness
// - action.devices.traits.ColorTemperature

class GoogleHome {
    constructor(adapter) {
        this.adapter = adapter;
        this.lang    = 'de';
        this.agentUserId = adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_');
    }
    setLanguage(_lang) {
        this.lang = _lang || 'de';
    }

    // https://developers.google.com/actions/smarthome/create#request
    sync(requestId) {
        return {
            requestId,
            payload: {
                //agentUserId: this.agentUserId,
                devices: [
                    {
                        "type": "action.devices.types.THERMOSTAT",
                        "traits": ["action.devices.traits.TemperatureSetting"],
                        "name": {
                            "defaultNames": ["Smart Thermostat"],
                            "name": "Smart Thermostat 0",
                            "nicknames": ["wall thermostat"]
                        },
                        "willReportState": false,
                        "roomHint": "",
                        "deviceInfo": {
                            "manufacturer": "Smart Home Provider",
                            "model": "g1338",
                            "swVersion": "1.0.31",
                            "hwVersion": "1.1"
                        },
                        "attributes": {
                            "availableThermostatModes": "off,heat,cool,on",
                            "thermostatTemperatureUnit": "C"
                        },
                        "customData": {
                            "id": "hm-rpc.0.BLABLA101.STATE"
                        },
                        "id": "hm-rpc.0.BLABLA101.STATE"
                    },
                    {
                        "type": "action.devices.types.REFRIGERATOR",
                        "traits": ["action.devices.traits.OnOff", "action.devices.traits.Toggles"],
                        "name": {
                            "defaultNames": ["Smart Fridge"],
                            "name": "Smart Refrigerator 1",
                            "nicknames": ["kitchen refrigerator"]
                        },
                        "willReportState": true,
                        "roomHint": "",
                        "deviceInfo": {
                            "manufacturer": "Sirius Cybernetics Corporation",
                            "model": "2331B",
                            "swVersion": "11.4",
                            "hwVersion": "11.2"
                        },
                        "attributes": {
                            "availableToggles": [{
                                "name": "quiet",
                                "name_values": [{"name_synonym": ["quiet", "silent"], "lang": "en"}]
                            }]
                        },
                        "customData": {
                            "id": "hm-rpc.0.BLABLA102"
                        },
                        "id": "hm-rpc.0.BLABLA102"
                    },
                    {
                        "type": "action.devices.types.LIGHT",
                        "traits": ["action.devices.traits.OnOff", "action.devices.traits.Toggles"],
                        "name": {
                            "defaultNames": ["Smart Outlet 2"],
                            "name": "Smart Outlet 2",
                            "nicknames": ["smart plug"]
                        },
                        "willReportState": false,
                        "roomHint": "",
                        "deviceInfo": {
                            "manufacturer": "Smart Home Provider",
                            "model": "g1340",
                            "swVersion": "1.0.31",
                            "hwVersion": "1.1"
                        },
                        "customData": {
                            "id": "hm-rpc.0.BLABLA103"
                        },
                        "id": "hm-rpc.0.BLABLA103"
                    },
                    {
                        "type": "action.devices.types.LIGHT",
                        "traits": ["action.devices.traits.OnOff", "action.devices.traits.Brightness", "action.devices.traits.ColorTemperature"],
                        "attributes": {
                            "temperatureMinK": 2000,
                            "temperatureMaxK": 6500
                        },
                        "name": {
                            "defaultNames": ["Smart Light"],
                            "name": "Smart Light 4",
                            "nicknames": ["table lamp"]
                        },
                        "willReportState": true,
                        "roomHint": "",
                        "deviceInfo": {
                            "manufacturer": "Smart Home Provider",
                            "model": "h1337",
                            "swVersion": "1.0.9",
                            "hwVersion": "1.0"
                        },
                        "customData": {
                            "id": "hm-rpc.0.BLABLA104"
                        },
                        "id": "hm-rpc.0.BLABLA104"
                    }
                ]
            }
        };
    }

    // possible responses
    query(requestId, devices) {
        const responseDev = {};

        devices.forEach(dev => {
            responseDev[dev.id] = {
                on: true,
                online: true,

                brightness: 44,
                color: {
                    name: 'soft white',
                    temperature: 2700
                }
            }
        });

        return {
            requestId,
            payload: {
                devices: responseDev
            }
        };
    }

    execute(requestId, commands) {
        const responseCommands = [];

        if (!commands) {
            this.adapter.log.error('Invalid parameter commands - NULL');
            return {error: 'Invalid parameter'};
        }

        commands.forEach(command => {
            console.log(`${command.execution[0].command} => ${command.execution[0].params.on}`);

            command.devices.forEach(dev => {
                console.log('For device ' + JSON.stringify(dev.customData));

                responseCommands.push({
                    ids: [dev.id],
                    status: 'SUCCESS',
                    states: {
                        on: true,
                        online: true
                    }
                });
            });
        });

        return {
            requestId,
            payload: {
                commands: responseCommands
            }
        };
    }

    process (request, isEnabled, callback) {
        if (!request) {
            this.adapter.log.error('Invalid request: no request!');
            return;
        }

        if (!isEnabled) {
            if (this.lang === 'en') {
                callback({error: 'The service deactivated', errorCode: 501});
            } else if (this.lang === 'ru') {
                callback({error: 'Сервис отключен', errorCode: 501});
            } else {
                callback({error: 'Der service ist deaktiviert', errorCode: 501});
            }

            return;
        }

        if (!request.inputs) {
            if (this.lang === 'en') {
                callback({error: 'missing inputs', errorCode: 401});
            } else if (this.lang === 'ru') {
                callback({error: 'Неправильные параметры', errorCode: 401});
            } else {
                callback({error: 'Falsche Parameter', errorCode: 401});
            }
            return;
        }

        let result;

        request.inputs.forEach(input => {
            let intent = input.intent;
            if (!intent) {
                if (this.lang === 'en') {
                    callback({error: 'missing inputs', errorCode: 401});
                } else if (this.lang === 'ru') {
                    callback({error: 'Неправильные параметры', errorCode: 401});
                } else {
                    callback({error: 'Falsche Parameter', errorCode: 401});
                }
                return;
            }

            this.adapter.log.debug(`Received ${intent}`);

            switch (intent) {
                case 'action.devices.SYNC':

                    /**
                     * request:
                     * {
                     *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *  "inputs": [{
                     *      "intent": "action.devices.SYNC",
                     *  }]
                     * }
                     */
                    result = this.sync(request.requestId);
                    break;

                case 'action.devices.QUERY':
                    /**
                     * request:
                     * {
                     *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *   "inputs": [{
                     *       "intent": "action.devices.QUERY",
                     *       "payload": {
                     *          "devices": [{
                     *            "id": "123",
                     *            "customData": {
                     *              "fooValue": 12,
                     *              "barValue": true,
                     *              "bazValue": "alpaca sauce"
                     *            }
                     *          }, {
                     *            "id": "234",
                     *            "customData": {
                     *              "fooValue": 74,
                     *              "barValue": false,
                     *              "bazValue": "sheep dip"
                     *            }
                     *          }]
                     *       }
                     *   }]
                     * }
                     */
                    result = this.query(request.requestId, input.payload.devices);
                    break;

                case 'action.devices.EXECUTE':
                    /**
                     * request:
                     * {
                     *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *   "inputs": [{
                     *     "intent": "action.devices.EXECUTE",
                     *     "payload": {
                     *       "commands": [{
                     *         "devices": [{
                     *           "id": "123",
                     *           "customData": {
                     *             "fooValue": 12,
                     *             "barValue": true,
                     *             "bazValue": "alpaca sauce"
                     *           }
                     *         }, {
                     *           "id": "234",
                     *           "customData": {
                     *              "fooValue": 74,
                     *              "barValue": false,
                     *              "bazValue": "sheep dip"
                     *           }
                     *         }],
                     *         "execution": [{
                     *           "command": "action.devices.commands.OnOff",
                     *           "params": {
                     *             "on": true
                     *           }
                     *         }]
                     *       }]
                     *     }
                     *   }]
                     * }
                     */
                    result = this.execute(request.requestId, input.payload.commands);
                    break;

                case 'action.devices.DISCONNECT':
                    this.adapter.log.info('Google home unlinked!');
                    result = {};
                    break;

                default:
                    result = {error: 'missing intent', errorCode: 401};
                    break;
            }

            if (result) {
                this.adapter.log.debug(`Response on ${intent}: ${JSON.stringify(result)}`);
                callback(result);
                callback = null;
                return false;
            }
        });

        if (callback) {
            if (this.lang === 'en') {
                callback({error: 'missing inputs', errorCode: 401});
            } else if (this.lang === 'ru') {
                callback({error: 'Неправильные параметры', errorCode: 401});
            } else {
                callback({error: 'Falsche Parameter', errorCode: 401});
            }
        }
    }
}

module.exports = GoogleHome;