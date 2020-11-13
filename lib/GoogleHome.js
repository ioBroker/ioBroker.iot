'use strict';
const request = require('request');
const textsT = require('./texts');
const roomsT = require('./rooms');
const funcsT = require('./functions');
const version = require('../package.json').version;
const {
    Types,
    ChannelDetector
} = require('iobroker.type-detector');

const PROTOCOL_VERSION = 1;
const RETRY_UNKNOWN_DEVICES_INTERVAL = 10 * 60000; // 10 minutes

const traitEnum = {
    'action.devices.traits.ArmDisarm': {
        command: 'arm',
        defaultAttributes: `{
            "availableArmLevels": {
              "levels": [
                {
                  "level_name": "L1",
                  "level_values": [
                    {
                      "level_synonym": [
                        "home and guarding",
                        "SL1"
                      ],
                      "lang": "en"
                    },
                    {
                      "level_synonym": [
                        "zuhause und bewachen",
                        "SL1"
                      ],
                      "lang": "de"
                    },
                    {
                      "level_synonym": [
                        "дома и охрана",
                        "SL1"
                      ],
                      "lang": "ru"
                    }
                  ]
                },
                {
                  "level_name": "L2",
                  "level_values": [
                    {
                      "level_synonym": [
                        "away and guarding",
                        "SL2"
                      ],
                      "lang": "en"
                    },
                    {
                      "level_synonym": [
                        "weg und bewachen",
                        "SL2"
                      ],
                      "lang": "de"
                    },
                    {
                      "level_synonym": [
                        "все ушли и охрана",
                        "SL2"
                      ],
                      "lang": "ru"
                    }
                  ]
                }
              ],
              "ordered": true
            }
          }`
    },
    'action.devices.traits.Brightness': {
        command: 'brightness',
        defaultAttributes: `{}`
    },
    'action.devices.traits.CameraStream': {
        command: 'cameraStream',
        defaultAttributes: `{
            "cameraStreamSupportedProtocols": [
              "hls",
              "dash"
            ],
            "cameraStreamNeedAuthToken": true,
            "cameraStreamNeedDrmEncryption": false
          }`
    },
    'action.devices.traits.ColorSetting_temperature': {
        command: 'color_temperature',
        defaultAttributes: `{
            "colorModel": "rgb",
            "colorTemperatureRange": {
              "temperatureMinK": 2000,
              "temperatureMaxK": 9000
            },
            "commandOnlyColorSetting": false
          }`
    },
    'action.devices.traits.ColorSetting_spectrumRGB': {
        command: 'color_spectrumRGB',
        defaultAttributes: `{
            "colorModel": "rgb",
            "colorTemperatureRange": {
              "temperatureMinK": 2000,
              "temperatureMaxK": 9000
            },
            "commandOnlyColorSetting": false
          }`
    },
    'action.devices.traits.Dock': {
        command: 'command',
        defaultAttributes: `{}`
    },
    'action.devices.traits.FanSpeed': {
        command: 'fanSped',
        getter: 'currentFanSpeedSetting',
        defaultAttributes: `{
            "availableFanSpeeds": {
              "speeds": [
                {
                  "speed_name": "Low",
                  "speed_values": [
                    {
                      "speed_synonym": [
                        "low",
                        "slow"
                      ],
                      "lang": "en"
                    },
                    {
                      "speed_synonym": [
                        "niedrig",
                        "schleppend"
                      ],
                      "lang": "de"
                    },
                    {
                      "speed_synonym": [
                        "вниз",
                        "медленно"
                      ],
                      "lang": "ru"
                    }
                  ]
                },
                {
                  "speed_name": "High",
                  "speed_values": [
                    {
                      "speed_synonym": [
                        "high"
                      ],
                      "lang": "en"
                    },
                    {
                      "speed_synonym": [
                        "hoch"
                      ],
                      "lang": "de"
                    },
                    {
                      "speed_synonym": [
                        "вверх"
                      ],
                      "lang": "ru"
                    }
                  ]
                }
              ],
              "ordered": true
            },
            "reversible": true
          }`
    },
    'action.devices.traits.LightEffects': {
        command: 'command',
        defaultAttributes: `{
            "supportedEffects": [
              "colorLoop"
            ]
          }`
    },
    'action.devices.traits.Locator': {
        command: 'command',
        defaultAttributes: `{}`
    },
    'action.devices.traits.LockUnlock': {
        command: 'lock',
        getter: 'isLocked',
        defaultAttributes: `{}`
    },
    'action.devices.traits.Modes': {
        command: 'updateModeSettings',
        defaultAttributes: `{
        "availableModes": [
          {
            "name": "load",
            "name_values": [
              {
                "name_synonym": [
                  "load",
                  "size",
                  "load size"
                ],
                "lang": "en"
              },
              {
                "name_synonym": [
                  "beladung",
                  "gewicht",
                  "beladungsgewicht"
                ],
                "lang": "de"
              },
              {
                "name_synonym": [
                  "загрузка",
                  "размер",
                  "размер загрузки"
                ],
                "lang": "ru"
              }
            ],
            "settings": [
              {
                "setting_name": "small",
                "setting_values": [
                  {
                    "setting_synonym": [
                      "small",
                      "half"
                    ],
                    "lang": "en"
                  },
                  {
                    "setting_synonym": [
                      "klein",
                      "hälfte"
                    ],
                    "lang": "de"
                  },
                  {
                    "setting_synonym": [
                      "малый",
                      "половниа"
                    ],
                    "lang": "ru"
                  }
                ]
              },
              {
                "setting_name": "large",
                "setting_values": [
                  {
                    "setting_synonym": [
                      "large",
                      "full"
                    ],
                    "lang": "en"
                  },
                  {
                    "setting_synonym": [
                      "große",
                      "voll"
                    ],
                    "lang": "de"
                  },
                  {
                    "setting_synonym": [
                      "большая",
                      "полная"
                    ],
                    "lang": "ru"
                  }
                ]
              }
            ],
            "ordered": true
          }
        ]
      }`
    },
    'action.devices.traits.OnOff': {
        command: 'on',
        defaultAttributes: `{
            "commandOnlyOnOff": false
          }`
    },
    'action.devices.traits.OpenClose': {
        command: 'openPercent',
        defaultAttributes: `{
            "openDirection": [
              "UP",
              "DOWN"
            ]
          }`
    },
    'action.devices.traits.RunCycle': {
        command: 'currentTotalRemainingTime',
        defaultAttributes: `{}`
    },
    'action.devices.traits.Scene': {
        command: 'ActivateScene',
        defaultAttributes: `{
            "sceneReversible": true
          }`
    },
    'action.devices.traits.StartStop': {
        command: 'start',
        getter: 'isRunning',
        defaultAttributes: ` {
            "pausable": false,
            "availableZones": [
              "kitchen",
              "living room",
              "master bedroom"
            ]
          }`
    },
    'action.devices.traits.TemperatureControl_temperatureSetpointCelsius': {
        command: 'temperature',
        getter: 'temperatureSetpointCelsius',
        defaultAttributes: `{
            "temperatureRange": {
              "minThresholdCelsius": 30,
              "maxThresholdCelsius": 100
            },
            "temperatureStepCelsius": 1,
            "temperatureUnitForUX": "C"
          }`
    },
    'action.devices.traits.TemperatureControl_temperatureAmbientCelsius': {
        command: '',
        getter: 'temperatureAmbientCelsius',
        defaultAttributes: `{}`
    },
    'action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint': {
        command: 'thermostatTemperatureSetpoint',
        defaultAttributes: `{
        "availableThermostatModes": "off,heat,cool,on",
        "thermostatTemperatureUnit": "C"
      }`
    },
    'action.devices.traits.TemperatureSetting_thermostatMode': {
        command: 'thermostatMode',
        defaultAttributes: `{}`
    },
    'action.devices.traits.TemperatureSetting_thermostatTemperatureAmbient': {
        command: '',
        getter: 'thermostatTemperatureAmbient',
        defaultAttributes: `{}`
    },
    'action.devices.traits.TemperatureSetting_thermostatHumidityAmbient': {
        command: '',
        getter: 'thermostatHumidityAmbient',
        defaultAttributes: `{}`
    },
    'action.devices.traits.Timer': {
        command: 'timerRemainingSec',
        defaultAttributes: `{
            "temperatureRange": {
              "minThresholdCelsius": 65.5,
              "maxThresholdCelcius": 288
            },
            "temperatureUnitForUX": "C",
            "pausable": false,
            "maxTimerLimitSec": 7200,
            "commandOnlyTimer": false
          }`
    },
    'action.devices.traits.Toggles': {
        command: 'updateToggleSettings',
        defaultAttributes: `{
            "availableToggles": [
              {
                "name": "sterilization",
                "name_values": [
                  {
                    "name_synonym": [
                      "bio-clean",
                      "ultrasound"
                    ],
                    "lang": "en"
                  }
                ]
              }
            ]
          }`
    },
    'action.devices.traits.Volume': {
        command: 'volumeLevel',
        defaultAttributes: `{}`
    },
};

const customToTraitEnum = {
    on:                            'action.devices.traits.OnOff',
    openClose:                     'action.devices.traits.OpenClose',
    openDirection:                 'action.devices.traits.OpenClose',
    openPercent:                   'action.devices.traits.OpenClose',
    isLocked:                      'action.devices.traits.LockUnlock',
    brightness:                    'action.devices.traits.Brightness',
    thermostatTemperatureSetpoint: 'action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint',
    thermostatTemperatureAmbient:  'action.devices.traits.TemperatureSetting_thermostatTemperatureAmbient',
    thermostatHumidityAmbient:     'action.devices.traits.TemperatureSetting_thermostatHumidityAmbient',
    color_spectrumRGB:             'action.devices.traits.ColorSetting_spectrumRGB',
    color_hue:                     'action.devices.traits.ColorSetting_spectrumRGB',
    color_saturation:              'action.devices.traits.ColorSetting_spectrumRGB',
    color_temperature:             'action.devices.traits.ColorSetting_temperature',
};

const URL_STATUS = 'https://gstatus.iobroker.in/v1/googleHomeStatus';

const ignoreIds = [
    /^system\./,
    /^script\./,
];

class GoogleHome {
    constructor(adapter, urlKey) {
        this.adapter         = adapter;
        this.urlKey          = urlKey;
        this.lang            = 'de';
        this.agentUserId     = adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_');

        this.smartDevices    = {};
        this.smartDevicesSentToGoogle = {};
        this.enums           = [];
        this.usedIds         = [];
        this.detector        = new ChannelDetector();
        this.urlKeyOk        = false;
        this.keyPromise      = null;
        this.keyPromiseTime  = null;
        this.unknownDevices  = {};
        this.reportedStates  = {};
        this.rateCalculation = [];

        this.tasksTimer      = null;

        this.converter = {
            [Types.socket]:      this.processSocket.bind(this),
            [Types.light]:       this.processLight.bind(this),
            [Types.info]:        this.processInfo.bind(this),
            [Types.dimmer]:      this.processDimmer.bind(this),
            [Types.rgbSingle]:   this.processRgbSingle.bind(this),
            [Types.rgb]:         this.processRgb.bind(this),
            [Types.hue]:         this.processHue.bind(this),
            [Types.ct]:          this.processCT.bind(this),
            [Types.temperature]: this.processTemperature.bind(this),
            [Types.thermostat]:  this.processThermostat.bind(this),
            [Types.button]:      this.processButton.bind(this),
            [Types.windowTilt]:  this.processWindowTilt.bind(this),
            [Types.door]:        this.processWindowTilt.bind(this),
            [Types.window]:      this.processWindowTilt.bind(this),
            [Types.blind]:       this.processBlind.bind(this),
            [Types.slider]:      this.processBlind.bind(this),
            [Types.media]:       this.processMedia.bind(this),
        };
    }

    checkUrlKey(forceCheck) {
        const now = Date.now();
        if (!this.keyPromise || now - this.keyPromiseTime > 900000) {
            /* 15 Minutes */
            this.keyPromiseTime = now;
            this.keyPromise = new Promise((resolve, reject) => {
                const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&p=${PROTOCOL_VERSION}&v=${version}`;
                request.get({
                    method: 'GET',
                    url
                }, (error, response, body) => {
                    if (!error && response && response.statusCode === 200) {
                        this.adapter.log.debug(`[GHOME] CHECK URL reported: ${JSON.stringify(body)}`);
                        this.urlKeyOk = true;
                        resolve();
                    } else {
                        this.adapter.config.googleHome && this.adapter.log.error('[GHOME] Url Key error. Google Request and Response are working. But device states are not reported automatically. If you have pro license please try to delete iot.0.certs: ' + (error || body.error || body));
                        reject(error || body);
                    }
                });
            });
        }

        return this.keyPromise;
    }

    _subscribeAllIds(ids, cb) {
        if (!ids || !ids.length) {
            cb && cb();
        } else {
            const id = ids.shift();
            if (!id) {
                setImmediate(() => this._subscribeAllIds(ids, cb))
            } else {
                console.log('Subscribe ' + id);
                this.adapter.subscribeForeignStates(id, () =>
                    setImmediate(() =>
                        this._subscribeAllIds(ids, cb)));
            }
        }
    }

    _unsubscribeAllIds(ids, cb) {
        if (!ids || !ids.length) {
            cb && cb();
        } else {
            const id = ids.shift();
            if (!id) {
                setImmediate(() => this._unsubscribeAllIds(ids, cb))
            } else {
                console.log('Unsubscribe ' + id);
                this.adapter.unsubscribeForeignStates(id, () => setImmediate(() => this._unsubscribeAllIds(ids, cb)));
            }
        }
    }

    unsubscribeAllIds(cb) {
        const ids = [];
        this.smartDevices && Object.keys(this.smartDevices).forEach(devId => {
            const custom = this.smartDevices[devId].customData;
            custom && Object.keys(custom).forEach(attr => {
                attr && attr.startsWith('get_') && !ids.includes(custom[attr]) && ids.push(custom[attr]);
            });
        });

        this.adapter.log.debug(`[GHOME] Unsubscribe ${ids.length} states for google home`);
        this._unsubscribeAllIds(ids, () => {
            this.adapter.log.debug(`[GHOME] Unsubscribe done`);
            cb && cb();
        });
    }

    subscribeAllIds(cb) {
        const ids = [];
        this.smartDevices && Object.keys(this.smartDevices).forEach(devId => {
            const custom = this.smartDevices[devId].customData;
            custom && Object.keys(custom).forEach(attr => attr && attr.startsWith('get_') && !ids.includes(custom[attr]) && ids.push(custom[attr]));
        });

        this.adapter.log.debug(`[GHOME] Subscribe ${ids.length} states for google home`);

        this._subscribeAllIds(ids, () => {
            this.adapter.log.debug(`[GHOME] Subscribe done`);
            cb && cb();
        });
    }

    getObjectName(obj, onlySimpleName) {
        let name = '';
        // extract from smartName the name
        if (!onlySimpleName) {
            if (this.adapter.config.noCommon) {
                if (obj.common &&
                    obj.common.custom &&
                    obj.common.custom[this.adapter.namespace] &&
                    obj.common.custom[this.adapter.namespace].smartName &&
                    obj.common.custom[this.adapter.namespace].smartName !== 'ignore') {
                    name = obj.common.custom[this.adapter.namespace].smartName;
                }
            } else {
                if (obj.common &&
                    obj.common.smartName &&
                    obj.common.smartName !== true &&
                    obj.common.smartName !== 'ignore') {
                    name = obj.common.smartName;
                }
            }
        }
        // if no smart name found, get the normal key
        if (!name && obj && obj.common && obj.common.name) {
            name = obj.common.name;
        }

        if (name && typeof name === 'object') {
            name = name[this.lang] || name['en'];
        }

        if (!name && obj) {
            name = obj._id.split('.').pop();
        }

        return name;
    }

    checkName(name, obj, room, func) {
        if (!name) {
            name = name || this.getObjectName(obj) || '';
            name = name.replace(/[^a-zA-ZöäüßÖÄÜа-яА-Я0-9ÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]/g, ' ');
            let _name = name.toLowerCase();
            let pos;
            if (room) {
                pos = _name.indexOf(room.toLowerCase());
                if (pos !== -1) {
                    name = name.substring(0, pos) + name.substring(pos + room.length);
                    _name = _name.substring(0, pos) + _name.substring(pos + room.length);
                }
            }
            if (func) {
                pos = _name.indexOf(func.toLowerCase());
                if (pos !== -1) {
                    name = name.substring(0, pos) + name.substring(pos + func.length);
                }
            }
            name = name.replace(/\s\s+/g, ' ').trim();
        }
        return name || func;
    }

    processSocket(id, control, name, room, func, obj) {
        const setOnOffState = control.states.find(state => state.name === 'SET' && state.id);
        const set_on = setOnOffState && setOnOffState.id;

        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = (getOnOffState && getOnOffState.id) || set_on;

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.OUTLET',
            traits: [
                'action.devices.traits.OnOff'
            ],
            name: {
                defaultNames: [room + 'steckdose'],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on
            },
            id
        };
    }

    processLight(id, control, name, room, func, obj) {
        const setOnOffState = control.states.find(state => state.name === 'SET' && state.id);
        const set_on = setOnOffState && setOnOffState.id;

        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = (getOnOffState && getOnOffState.id) || set_on;

        const traits = [
            'action.devices.traits.OnOff'
        ];
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on
            },
            id
        };
    }

    processInfo(id, control, name, room, func, obj) {

        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = (getOnOffState && getOnOffState.id);

        name = this.checkName(name, obj, room, func);

        const get_isLocked = get_on;
        const set_lock = get_on;
        const set_openPercent = set_lock;
        const get_openPercent = get_isLocked;

        const traits = [];

        traits.push('action.devices.traits.LockUnlock');
        traits.push('action.devices.traits.OpenClose');

        return {
            type: 'action.devices.types.SENSOR',
            traits: traits,
            displayTraits: ['action.devices.traits.OpenClose'],
            name: {
                defaultNames: [room + func],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            attributes: {
                queryOnlyOpenClose: true
            },
            displayAttributes: JSON.stringify({
                queryOnlyOpenClose: true
            }),
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                get_isLocked,
                set_lock,
                set_openPercent,
                get_openPercent,
            },
            id
        };

    }

    processButton(id, control, name, room, func, obj) {
        const setOnOffState = control.states.find(state => state.name === 'SET' && state.id);
        const set_on = setOnOffState && setOnOffState.id;

        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = (getOnOffState && getOnOffState.id) || set_on;

        const traits = [
            'action.devices.traits.OnOff'
        ];
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.SWITCH',
            traits,
            name: {
                defaultNames: [room + func],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on
            },
            id
        };
    }

    processDimmer(id, control, name, room, func, obj) {
        const setBrightnessState = control.states.find(state => state.name === 'SET' && state.id);
        let set_brightness = setBrightnessState && setBrightnessState.id;
        if (set_brightness.indexOf('.dimspeed') !== -1) {
            let idArray = set_brightness.split('.');
            idArray.pop();
            idArray.push('bri');
            set_brightness = idArray.join('.');
        }
        const getBrightnessState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_brightness = (getBrightnessState && getBrightnessState.id) || set_brightness;

        const setOnOffState = control.states.find(state => state.name === 'ON_SET' && state.id);
        const set_on = setOnOffState && setOnOffState.id || set_brightness;

        const getOnOffState = control.states.find(state => state.name === 'ON_ACTUAL' && state.id);
        const get_on = (getOnOffState && getOnOffState.id) || set_on;

        const traits = [];

        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }

        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.Brightness'],
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness
            },
            id
        };
    }

    processHue(id, control, name, room, func, obj) {
        let setBrightnessState = control.states.find(state => state.name === 'BRIGHTNESS' && state.id);
        if (!setBrightnessState) {
            setBrightnessState = control.states.find(state => state.name === 'DIMMER' && state.id);
        }
        const set_brightness = setBrightnessState && setBrightnessState.id;
        const get_brightness = set_brightness;

        let setOnOffState = control.states.find(state => state.name === 'ON' && state.id);

        const set_on = setOnOffState && setOnOffState.id || set_brightness;
        const get_on = set_on;

        let setHueState = control.states.find(state => state.name === 'HUE' && state.id);

        const set_color_hue = setHueState && setHueState.id;
        const get_color_hue = set_color_hue;

        let setSaturationState = control.states.find(state => state.name === 'SATURATION' && state.id);

        const set_color_saturation = setSaturationState && setSaturationState.id;
        const get_color_saturation = set_color_saturation;

        let setTempState = control.states.find(state => state.name === 'TEMPERATURE' && state.id);

        const set_color_temperature = setTempState && setTempState.id;
        const get_color_temperature = set_color_temperature;

        const traits = [];

        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }

        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }
        if (set_color_hue) {
            traits.push('action.devices.traits.ColorSetting');
        }
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.ColorSetting_spectrumRGB'],

            attributes: {
                colorModel: 'rgb',
                colorTemperatureRange: {
                    temperatureMinK: 2000,
                    temperatureMaxK: 9000
                }
            },
            displayAttributes: JSON.stringify({
                colorModel: 'rgb',
                colorTemperatureRange: {
                    temperatureMinK: 2000,
                    temperatureMaxK: 9000
                }
            }),
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness,
                set_color_hue,
                get_color_hue,
                set_color_saturation,
                get_color_saturation,
                set_color_temperature,
                get_color_temperature
            },
            id
        };
    }

    processRgbSingle(id, control, name, room, func, obj) {
        let setBrightnessState = control.states.find(state => state.name === 'BRIGHTNESS' && state.id);
        if (!setBrightnessState) {
            setBrightnessState = control.states.find(state => state.name === 'DIMMER' && state.id);
        }
        const set_brightness = setBrightnessState && setBrightnessState.id;
        const get_brightness = set_brightness;

        let setOnOffState = control.states.find(state => state.name === 'ON_LIGHT' && state.id);
        if (!setOnOffState) {
            setOnOffState = control.states.find(state => state.name === 'ON' && state.id);
        }
        const set_on = setOnOffState && setOnOffState.id || set_brightness;
        const get_on = set_on;

        let setRGBState = control.states.find(state => state.name === 'RGB' && state.id);

        const set_color_spectrumRGB = setRGBState && setRGBState.id;
        const get_color_spectrumRGB = set_color_spectrumRGB;

        let setTempState = control.states.find(state => state.name === 'TEMPERATURE' && state.id);

        const set_color_temperature = setTempState && setTempState.id;
        const get_color_temperature = set_color_temperature;

        const traits = [];

        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }

        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }

        if (set_color_spectrumRGB) {
            traits.push('action.devices.traits.ColorSetting');
        }

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.ColorSetting_spectrumRGB'],

            attributes: {
                colorModel: 'rgb',
                colorTemperatureRange: {
                    temperatureMinK: 2000,
                    temperatureMaxK: 9000
                }
            },
            displayAttributes: JSON.stringify({
                colorModel: 'rgb',
                colorTemperatureRange: {
                    temperatureMinK: 2000,
                    temperatureMaxK: 9000
                }
            }),
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness,
                set_color_spectrumRGB,
                get_color_spectrumRGB,
                set_color_temperature,
                get_color_temperature
            },
            id
        };
    }

    processRgb(id, control, name, room, func, obj) {

        let setBrightnessState = control.states.find(state => state.name === 'BRIGHTNESS' && state.id);
        if (!setBrightnessState) {
            setBrightnessState = control.states.find(state => state.name === 'DIMMER' && state.id);
        }
        const set_brightness = setBrightnessState && setBrightnessState.id;
        const get_brightness = set_brightness;

        let setOnOffState = control.states.find(state => state.name === 'ON_LIGHT' && state.id);
        if (!setOnOffState) {
            setOnOffState = control.states.find(state => state.name === 'ON' && state.id);
        }
        const set_on = setOnOffState && setOnOffState.id || set_brightness;
        const get_on = set_on;

        let setTempState = control.states.find(state => state.name === 'TEMPERATURE' && state.id);

        const set_color_temperature = setTempState && setTempState.id;
        const get_color_temperature = set_color_temperature;


        let setRState = control.states.find(state => state.name === 'RED' && state.id);

        const set_color_R = setRState && setRState.id;
        const get_color_R = set_color_R;

        let setGState = control.states.find(state => state.name === 'GREEN' && state.id);

        const set_color_G = setGState && setGState.id;
        const get_color_G = set_color_G;

        let setBState = control.states.find(state => state.name === 'BLUE' && state.id);

        const set_color_B = setBState && setBState.id;
        const get_color_B = set_color_B;


        const traits = [];

        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }

        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }

        traits.push('action.devices.traits.ColorSetting');

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.ColorSetting_spectrumRGB'],

            attributes: {
                colorModel: 'rgb',
                colorTemperatureRange: {
                    temperatureMinK: 2000,
                    temperatureMaxK: 9000
                }
            },
            displayAttributes: JSON.stringify({
                colorModel: 'rgb',
                colorTemperatureRange: {
                    temperatureMinK: 2000,
                    temperatureMaxK: 9000
                }
            }),
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness,
                set_color_temperature,
                get_color_temperature,
                set_color_R,
                get_color_R,
                set_color_G,
                get_color_G,
                set_color_B,
                get_color_B,
            },
            id
        };
    }

    processCT(id, control, name, room, func, obj) {
        let setBrightnessState = control.states.find(state => state.name === 'BRIGHTNESS' && state.id);
        if (!setBrightnessState) {
            setBrightnessState = control.states.find(state => state.name === 'DIMMER' && state.id);
        }
        const set_brightness = setBrightnessState && setBrightnessState.id;
        const get_brightness = set_brightness;

        let setOnOffState = control.states.find(state => state.name === 'ON' && state.id);
        if (!setOnOffState) {
            setOnOffState = control.states.find(state => state.name === 'ON_LIGHT' && state.id);
        }
        const set_on = setOnOffState && setOnOffState.id || set_brightness;
        const get_on = set_on;

        let setTempState = control.states.find(state => state.name === 'TEMPERATURE' && state.id);

        const set_color_temperature = setTempState && setTempState.id;
        const get_color_temperature = set_color_temperature;


        const traits = [];

        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }

        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }
        if (set_color_temperature) {
            traits.push('action.devices.traits.ColorSetting');
        }
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.ColorSetting_temperature'],
            attributes: {
                colorModel: 'rgb',
                colorTemperatureRange: {
                    temperatureMinK: 2000,
                    temperatureMaxK: 9000
                }
            },
            displayAttributes: JSON.stringify({
                colorModel: 'rgb',
                colorTemperatureRange: {
                    temperatureMinK: 2000,
                    temperatureMaxK: 9000
                }
            }),
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness,
                set_color_temperature,
                get_color_temperature
            },
            id
        };
    }

    processWindowTilt(id, control, name, room, func, obj) {

        const getWindowTile = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_isLocked = (getWindowTile && getWindowTile.id);
        const set_lock = (getWindowTile && getWindowTile.id);
        const set_openPercent = set_lock;
        const get_openPercent = get_isLocked;

        const traits = [];

        traits.push('action.devices.traits.LockUnlock');
        traits.push('action.devices.traits.OpenClose');

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.WINDOW',
            traits,
            attributes: {
                queryOnlyOpenClose: true
            },
            displayAttributes: JSON.stringify({
                queryOnlyOpenClose: true
            }),
            name: {
                defaultNames: [textsT(this.lang, 'window', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_lock,
                get_isLocked,
                set_openPercent,
                get_openPercent
            },
            id
        };
    }

    processBlind(id, control, name, room, func, obj) {

        const getOpenPercent = control.states.find(state => state.name === 'SET' && state.id);
        const set_openPercent = (getOpenPercent && getOpenPercent.id);
        const get_openPercent = set_openPercent;


        const getOpenDirection = control.states.find(state => state.name === 'DIRECTION' && state.id);
        const set_openDirection = (getOpenDirection && getOpenDirection.id);
        const get_openDirection = set_openDirection;

        const traits = [];

        traits.push('action.devices.traits.OpenClose');

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.BLINDS',
            traits,
            name: {
                defaultNames: [textsT(this.lang, 'blinds', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_openPercent,
                get_openPercent,
                set_openDirection,
                get_openDirection,
            },
            id
        };
    }

    processTemperature(id, control, name, room, func, obj) {

        const setThermostatTemperatureSetpoint = control.states.find(state => state.name === 'SET' && state.id);
        const set_thermostatTemperatureSetpoint = setThermostatTemperatureSetpoint && setThermostatTemperatureSetpoint.id;

        const getThermostatTemperatureAmbient = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_thermostatTemperatureAmbient = (getThermostatTemperatureAmbient && getThermostatTemperatureAmbient.id) || set_thermostatTemperatureSetpoint;

        const getThermostatHumidityAmbient = control.states.find(state => state.name === 'SECOND' && state.id);
        const get_thermostatHumidityAmbient = (getThermostatHumidityAmbient && getThermostatHumidityAmbient.id);


        const traits = [];
        traits.push('action.devices.traits.TemperatureSetting');


        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.THERMOSTAT',
            traits,
            displayTraits: ['action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint'],
            attributes: {
                queryOnlyTemperatureSetting: true,
                thermostatTemperatureUnit: 'C'
            },
            displayAttributes: JSON.stringify({
                queryOnlyTemperatureSetting: true,
                thermostatTemperatureUnit: 'C'
            }),
            name: {
                defaultNames: [textsT(this.lang, 'thermostat', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_thermostatTemperatureSetpoint,
                get_thermostatTemperatureAmbient,
                get_thermostatHumidityAmbient,
            },
            id
        };
    }

    processThermostat(id, control, name, room, func, obj) {
        const setThermostatTemperatureSetpoint = control.states.find(state => state.name === 'SET' && state.id);
        const set_thermostatTemperatureSetpoint = setThermostatTemperatureSetpoint && setThermostatTemperatureSetpoint.id;
        const get_thermostatTemperatureSetpoint = set_thermostatTemperatureSetpoint;
        const getThermostatTemperatureAmbient = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_thermostatTemperatureAmbient = (getThermostatTemperatureAmbient && getThermostatTemperatureAmbient.id) || set_thermostatTemperatureSetpoint;

        const getThermostatHumidityAmbient = control.states.find(state => state.name === 'HUMIDITY' && state.id);
        const get_thermostatHumidityAmbient = (getThermostatHumidityAmbient && getThermostatHumidityAmbient.id);


        const traits = [];
        traits.push('action.devices.traits.TemperatureSetting');

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.THERMOSTAT',
            traits,
            displayTraits: ['action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint'],
            attributes: {
                availableThermostatModes: 'off,heat,cool,on',
                thermostatTemperatureUnit: 'C'
            },
            displayAttributes: JSON.stringify({
                availableThermostatModes: 'off,heat,cool,on',
                thermostatTemperatureUnit: 'C'
            }),

            name: {
                defaultNames: [textsT(this.lang, 'thermostat', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: false,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_thermostatTemperatureSetpoint,
                get_thermostatTemperatureSetpoint,
                get_thermostatTemperatureAmbient,
                get_thermostatHumidityAmbient,
            },
            id
        };
    }

    processMedia(id, control, name, room, func, obj) {
        const setOnOffState = control.states.find(state => state.name === 'STATE' && state.id);
        const set_on = setOnOffState && setOnOffState.id;
        const get_on = set_on;

        const setPlayState = control.states.find(state => state.name === 'PLAY' && state.id);
        const set_mediaPlay = (setPlayState && setPlayState.id) || set_on;

        const setPauseState = control.states.find(state => state.name === 'PAUSE' && state.id);
        const set_mediaPause = (setPauseState && setPauseState.id);

        const setStopState = control.states.find(state => state.name === 'STOP' && state.id);
        const set_mediaStop = (setStopState && setStopState.id);

        const setNextState = control.states.find(state => state.name === 'NEXT' && state.id);
        const set_mediaNext = (setNextState && setNextState.id);

        const setPrevState = control.states.find(state => state.name === 'PREV' && state.id);
        const set_mediaPrev = (setPrevState && setPrevState.id);

        const setVolumeState = control.states.find(state => state.name === 'VOLUME' && state.id);
        const set_brightness = (setVolumeState && setVolumeState.id);

        const traits = [
            'action.devices.traits.OnOff',
            'action.devices.traits.MediaState',
            'action.devices.traits.Brightness',
        ];
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.SPEAKER',
            traits,
            displayTraits: ['action.devices.traits.Brightness'],
            name: {
                defaultNames: [textsT(this.lang, 'media', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on,
                set_mediaPlay,
                set_mediaPause,
                set_mediaStop,
                set_mediaNext,
                set_mediaPrev,
                set_brightness,
            },
            id
        };
    }

    setLanguage(_lang) {
        this.lang = _lang || 'de';
    }

    getSmartName(states, id) {
        if (!id) {
            if (!this.adapter.config.noCommon) {
                if (states.common) {
                    return states.common.smartName;
                } else {
                    this.adapter.log.warn(`[GHOME] No common property for ${JSON.stringify(states)} IoT options available please check the state.`);
                    return null;
                }

            } else {
                return (states &&
                        states.common &&
                        states.common.custom &&
                        states.common.custom[this.adapter.namespace]) ?
                    states.common.custom[this.adapter.namespace].smartName : undefined;
            }
        } else
        if (!this.adapter.config.noCommon) {
            return states[id] && states[id].common ? states[id].common.smartName : null;
        } else {
            return (states[id] &&
                    states[id].common &&
                    states[id].common.custom &&
                    states[id].common.custom[this.adapter.namespace]) ?
                states[id].common.custom[this.adapter.namespace].smartName || null : null;
        }
    }

    async processState(ids, objects, id, roomName, funcName, result, smartEnum, parentId) {
        try {
            if (!id || !objects[id] || result[id]) {
                return;
            }
            this.adapter.log.debug(`[GHOME] Process: ${id} ${roomName} ${funcName}`);
            let smartName = this.getSmartName(objects, id);

            if (!(smartName === undefined) && (smartName === 'ignore' || smartName === false)) {
                this.adapter.log.warn(`[GHOME] ${id} is ignored because the property smartName is false or ignore. To use this state again, remove the property smartName in Object explorer or add it manually under Google Devices`);
                return;
            }

            let friendlyName = '';
            if (typeof smartName === 'object' && smartName) {
                friendlyName = smartName[this.lang] || smartName.en;
            }
            if (!friendlyName) {
                friendlyName = this.checkName('', objects[id], roomName, funcName);
            }

            //check if comes from smart enum and is not writable
            // if (smartEnum && objects[id].common.write === false) {
            //     return;
            // }

            result[id] = {};
            result[id].traits = [];
            result[id].customData = {};
            if (parentId) {
                result[id].parentId = parentId;
            }

            let childStates = [];
            result[id].ioType = objects[id].type;
            if (objects[id].type === 'channel') {
                childStates = this.getAllStatesInChannel(Object.keys(objects), id);
            } else if (objects[id].type === 'device') {

                childStates = this.getAllStatesInDevice(Object.keys(objects), id);
                // if no states, it may be device without channels
                if (!childStates.length) {
                    childStates = this.getAllStatesInChannel(Object.keys(objects), id);
                }
            }

            if (typeof smartName === 'object' && smartName) {
                result[id]['conv2GH'] = {};
                result[id]['displayConv2GH'] = '';
                result[id]['conv2iob'] = {};
                result[id]['displayConv2iob'] = '';
                if (smartName.ghConv2GH) {
                    result[id]['conv2GH'][id] = smartName.ghConv2GH;
                    result[id]['displayConv2GH'] = smartName.ghConv2GH;
                }
                if (smartName.ghConv2iob) {
                    result[id]['conv2iob'][id] = smartName.ghConv2iob;
                    result[id]['displayConv2iob'] = smartName.ghConv2iob;
                }
            }
            if ((typeof smartName === 'object' && smartName && smartName.ghType && smartName.ghTraits) || parentId) {
                if (smartName && smartName.ghType) {
                    result[id].type = smartName.ghType
                }
                if (smartName && smartName.ghTraits && smartName.ghTraits.length > 0 && smartName.ghTraits[0]) {
                    result[id].traits = [smartName.ghTraits[0].split('_')[0]];
                    result[id].displayTraits = [smartName.ghTraits[0]];
                }
                try {
                    if (smartName && smartName.ghAttributes) {
                        result[id].attributes = JSON.parse(smartName.ghAttributes);
                        result[id].displayAttributes = JSON.stringify(result[id].attributes);
                    }
                } catch (error) {
                    this.adapter.log.error(`[GHOME] Cannot parse attributes ${error} ${smartName.ghAttributes}`);
                    this.adapter.log.error(`[GHOME] Cannot parse attributes ${error} ${smartName.ghAttributes}`);
                    result[id].attributes = {};
                    result[id].displayAttributes = smartName.ghAttributes

                }
                childStates.forEach((child) =>
                    this.processState(ids, objects, child, roomName, funcName, result, false, id));
            } else if (smartEnum) {
                try {
                    // try to detect device
                    if (id.match(/^hm-rpc\..*?\.CUX/)) {
                        this.adapter.log.debug('[GHOME] Ignore "' + id + '": Because it is a virtual device');
                        return
                    }
                    const options = {
                        objects: objects,
                        id: id,
                        _keysOptional: ids,
                        _usedIdsOptional: this.usedIds
                    };

                    const controls = this.detector.detect(options);
                    // if (id.indexOf('deconz.0.Lights.27') !== -1)
                    //     debugger
                    if (controls) {

                        let control = controls[0];
                        if (controls[0].type === 'socket' && controls[1] && controls[1].type !== 'info') {
                            control = controls[1];
                        }
                        this.adapter.log.debug(`[GHOME] Type: ${control.type}`);

                        if (this.converter.hasOwnProperty(control.type)) {
                            this.adapter.log.info(`[GHOME] ${id} is auto added with type  ${control.type}.`);
                            result[id] = this.converter[control.type](id, control, friendlyName, roomName, funcName, objects[id]);
                            result[id].displayTraits = result[id].displayTraits || result[id].traits;

                            if (typeof smartName === 'object' && smartName && smartName.ghAttributes) {
                                result[id].attributes = JSON.parse(smartName.ghAttributes);
                                result[id].displayAttributes = JSON.stringify(result[id].attributes);
                            }

                            result[id].smartEnum = 'X';
                            result[id]['conv2GH'] = {};
                            result[id]['conv2iob'] = {};

                            if (result[id].customData.set_brightness) {
                                const bri_state = await this.adapter.getForeignObjectAsync(result[id].customData.set_brightness);
                                if (bri_state && bri_state.common && bri_state.common.max && bri_state.common.max >= 101) {
                                    result[id]['conv2GH'][result[id].customData.set_brightness] = 'return value/' + bri_state.common.max / 100;
                                    result[id]['conv2iob'][result[id].customData.set_brightness] = 'return value*' + bri_state.common.max / 100;
                                }

                            }
                            if (result[id].customData.set_color_temperature) {
                                const set_color_temperature = await this.adapter.getForeignObjectAsync(result[id].customData.set_color_temperature);
                                if (set_color_temperature && set_color_temperature.common && set_color_temperature.common.max <= 500) {
                                    result[id]['conv2GH'][result[id].customData.set_color_temperature] = 'return 1000000/value';
                                    result[id]['conv2iob'][result[id].customData.set_color_temperature] = 'return 1000000/value';
                                }
                            }

                            result[id].ioType = objects[id].type;

                            this.adapter.log.debug('[GHOME] Created Google HOME device: ' + result[id].name.defaultNames[0] + ' - ' + control.type + ' - ' + id);

                            //   childStates.forEach((child) => {
                            Object.keys(result[id].customData).forEach(element => {
                                // if (element.indexOf('get_') !== -1) {

                                const childID = result[id].customData[element];

                                if (!childID) {
                                    return;
                                }
                                if (childID === id) {
                                    this.adapter.log.debug(`[GHOME] SmartEnum is equal child skip child detection`);
                                    return;
                                }

                                if (result[childID] && !result[childID].smartEnum) {
                                    result[childID].parentId = id;
                                    this.adapter.log.warn(`[GHOME] ${childID} has custom settings this is overriding auto-detected settings. To use auto-detected settings please delete this state in the instance settings under Google Devices.`);
                                    return;
                                }
                                const trait = customToTraitEnum[element.substring(4)];
                                result[childID] = {};
                                result[childID].traits = [trait];
                                result[childID].roomHint = roomName;
                                result[childID].smartEnum = 'X';
                                result[childID].type = result[id].type;

                                result[childID].ioType = objects[childID] ? objects[childID].type : '';
                                if (element.indexOf('set_') !== -1) {
                                    result[childID].ioType = ' SETTER:\n\u00a0\u00a0\u00a0\u00a0' + result[childID].ioType
                                }
                                result[childID].displayTraits = [trait];
                                if (childID && result[id]['conv2GH'][childID]) {
                                    result[childID]['displayConv2GH'] = result[id]['conv2GH'][childID]
                                }
                                if (childID && result[id]['conv2iob'][childID]) {
                                    result[childID]['displayConv2iob'] = result[id]['conv2iob'][childID]
                                }
                                result[childID].parentId = id;
                                result[childID].name = {
                                    nicknames: [childID]
                                };
                                result[childID].id = childID;
                                // }
                            });
                            //   })

                        } else {
                            this.adapter.log.info(`[GHOME] Cannot auto convert ${id}. Type ${control.type} is not available, yet. If you need the state please add him manually`);
                            this.adapter.log.debug(`[GHOME] ${JSON.stringify(control)}`)
                        }
                        // });
                    } else {
                        console.log(`[GHOME] Nothing found for ${options.id}`);
                    }
                } catch (e) {
                    this.adapter.log.error('[GHOME] Cannot process "' + id + '": ' + e);
                    this.adapter.log.error('[GHOME] ' + e.stack);
                }
                return;

            } else if (typeof smartName === 'object' && smartName && smartName.smartType) {
                //SMARTTYPES = ['LIGHT', 'SWITCH', 'THERMOSTAT', 'ACTIVITY_TRIGGER', 'SCENE_TRIGGER', 'SMARTPLUG', 'SMARTLOCK', 'CAMERA'];
                switch (smartName.smartType) {
                    case 'LIGHT':
                        result[id].traits = [
                            'action.devices.traits.OnOff'
                        ];
                        result[id].type = 'action.devices.types.LIGHT';
                        break;
                    case 'SWITCH':
                        result[id].traits = [
                            'action.devices.traits.OnOff'
                        ];
                        result[id].type = 'action.devices.types.SWITCH';
                        break;
                    case 'SMARTPLUG':
                        result[id].traits = [
                            'action.devices.traits.OnOff'
                        ];
                        result[id].type = 'action.devices.types.OUTLET';
                        break;
                    case 'SMARTLOCK':
                        result[id].traits = [
                            'action.devices.traits.LockUnlock'
                        ];
                        result[id].type = 'action.devices.types.DOOR';
                        break;
                }

                result[id].displayTraits = result[id].displayTraits || result[id].traits;
                result[id].ioType = objects[id].type;
                result[id].smartEnum = 'X';

                let friendlyNamesArray = [];
                if (friendlyName) {
                    friendlyNamesArray = friendlyName.replace(/, /g, ',').split(',');
                }

                result[id].name = {
                    defaultNames: [this.getObjectName(objects[id], true)],
                    name: friendlyNamesArray[0],
                    nicknames: friendlyNamesArray
                };
                result[id].willReportState = true;
                result[id].roomHint = roomName || '';
                result[id].deviceInfo = {
                    manufacturer: 'ioBroker',
                    model: id.split('.')[0],
                };
                result[id].id = id;
                result[id].otherDeviceIds = [{
                    deviceId: id
                }];

                this.adapter.log.debug('[GHOME] Created Google HOME device from Alexa SmartType: ' + result[id].name.defaultNames[0] + ' - ' + result[id].type + ' - ' + id);

                return;
            } else {
                //friendlyName = this.checkName('', objects[id], roomName, funcName);
                delete result[id];
                return;
            }


            let friendlyNamesArray = [];
            if (friendlyName) {
                friendlyNamesArray = friendlyName.replace(/, /g, ',').split(',');
            }

            result[id].name = {
                defaultNames: [this.getObjectName(objects[id], true)],
                name: friendlyNamesArray[0],
                nicknames: friendlyNamesArray
            };
            result[id].willReportState = true;
            result[id].roomHint = roomName || '';
            result[id].deviceInfo = {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            };
            result[id].id = id;
            result[id].otherDeviceIds = [{
                deviceId: id
            }];
            if (smartName && smartName.ghTraits && smartName.ghTraits.length > 0 && smartName.ghTraits[0] && traitEnum[smartName.ghTraits[0]]) {
                const command = traitEnum[smartName.ghTraits[0]].command;
                const getter = traitEnum[smartName.ghTraits[0]].getter;
                if (command) {
                    result[id].customData['set_' + command] = id;
                }
                if (getter) {
                    result[id].customData['get_' + getter] = id;
                } else {
                    result[id].customData['get_' + command] = id;
                }

                //check if is default attributes
                Object.keys(traitEnum).forEach((trait) => {
                    try {
                        if (JSON.stringify(JSON.parse(traitEnum[trait].defaultAttributes)) === JSON.stringify(JSON.parse(smartName.ghAttributes))) {
                            smartName.ghAttributes = '';
                        }
                    } catch (error) {

                    }
                });

                if (!smartName.ghAttributes && traitEnum[smartName.ghTraits[0]].defaultAttributes) {
                    const defaultAttributes = traitEnum[smartName.ghTraits[0]].defaultAttributes;
                    result[id].attributes = JSON.parse(defaultAttributes);
                    this.adapter.extendForeignObject(id, {
                        common: {
                            smartName: {
                                ghAttributes: defaultAttributes
                            }
                        }
                    });
                } else {
                    result[id].attributes = {};
                }

            }
            //merge states with same name and room
            if (this.smartNames[friendlyName] && this.smartNames[friendlyName].roomHint === roomName) {
                if (smartName && smartName.ghTraits && Array.isArray(smartName.ghTraits) && smartName.ghTraits.length > 0 && smartName.ghTraits[0]) {
                    const orgId = this.smartNames[friendlyName].id;
                    result[orgId].traits.push(smartName.ghTraits[0].split('_')[0]);

                    if (result[id].attributes) {
                        if (result[orgId].attributes) {
                            result[orgId].attributes = Object.assign(result[orgId].attributes, result[id].attributes);
                        } else {
                            result[orgId].attributes = result[id].attributes;
                        }
                    }
                    result[orgId]['conv2GH'] = {...result[orgId]['conv2GH'], ...result[id]['conv2GH']};
                    result[orgId]['conv2iob'] = {...result[orgId]['conv2iob'], ...result[id]['conv2iob']};

                    const command = traitEnum[smartName.ghTraits[0]].command;
                    const getter = traitEnum[smartName.ghTraits[0]].getter;
                    if (command) {
                        result[orgId].customData['set_' + command] = id;
                    }
                    if (getter) {
                        result[orgId].customData['get_' + getter] = id;
                    } else {
                        result[orgId].customData['get_' + command] = id;
                    }
                    this.adapter.log.debug(`[GHOME] ${JSON.stringify(result[orgId])}`);
                    result[id].merged = true;
                }
            } else {
                this.smartNames[friendlyName] = result[id];
            }
            this.adapter.log.debug(`[GHOME] ${JSON.stringify(result[id])}`)
        } catch (error) {
            if (id && result[id]) {
                delete result[id];
            }
            this.adapter.log.error(`[GHOME] Cannot process: ${id} ${error}`);
            this.adapter.log.error(`[GHOME] ${objects[id]}`);
            this.adapter.log.debug(`[GHOME] ${error.stack}`);
        }
    }

    getAllStatesInChannel(keys, channelId) {
        const reg = new RegExp('^' + channelId.replace(/\./g, '\\.') + '\\.[^.]+$');
        return keys.filter(_id => reg.test(_id));
    }

    getAllStatesInDevice(keys, channelId) {
        const reg = new RegExp('^' + channelId.replace(/\./g, '\\.') + '\\.[^.]+\\.[^.]+$');
        return keys.filter(_id => reg.test(_id));
    }

    _readObjects() {
        return new Promise(resolve => {
            this.adapter.getObjectView('system', 'state', {}, (err, _states) => {
                this.adapter.getObjectView('system', 'channel', {}, (err, _channels) => {
                    this.adapter.getObjectView('system', 'device', {}, (err, _devices) => {
                        this.adapter.getObjectView('system', 'enum', {}, (err, _enums) => {
                            const objects = {};
                            const enums = {};
                            if (_devices && _devices.rows) {
                                for (let i = 0; i < _devices.rows.length; i++) {
                                    if (_devices.rows[i].value && _devices.rows[i].value._id && !ignoreIds.find(reg => reg.test(_devices.rows[i].value._id))) {
                                        objects[_devices.rows[i].value._id] = _devices.rows[i].value;
                                    }
                                }
                            }
                            if (_channels && _channels.rows) {
                                for (let i = 0; i < _channels.rows.length; i++) {
                                    if (_channels.rows[i].value && _channels.rows[i].value._id && !ignoreIds.find(reg => reg.test(_channels.rows[i].value._id))) {
                                        objects[_channels.rows[i].value._id] = _channels.rows[i].value;
                                    }
                                }
                            }
                            if (_states && _states.rows) {
                                for (let i = 0; i < _states.rows.length; i++) {
                                    if (_states.rows[i].value && _states.rows[i].value._id && !ignoreIds.find(reg => reg.test(_states.rows[i].value._id))) {
                                        objects[_states.rows[i].value._id] = _states.rows[i].value;
                                    }
                                }
                            }
                            if (_enums && _enums.rows) {
                                for (let i = 0; i < _enums.rows.length; i++) {
                                    if (_enums.rows[i].value && _enums.rows[i].value._id) {
                                        enums[_enums.rows[i].value._id] = _enums.rows[i].value;
                                        objects[_enums.rows[i].value._id] = _enums.rows[i].value;
                                    }
                                }
                            }
                            resolve({
                                objects,
                                enums
                            });
                        });
                    });
                });
            });
        });
    }

    filterValidGoogleDevices() {
        let returnObject = {};
        Object.keys(this.smartDevices).map(id => {
            if (!this.smartDevices[id].merged) {
                if ((this.smartDevices[id].name && this.smartDevices[id].name.name && this.smartDevices[id].type && this.smartDevices[id].traits && this.smartDevices[id].traits.length > 0) || this.smartDevices[id].parentId) {
                    returnObject[id] = this.smartDevices[id];
                }
            }
        });
        return returnObject;
    }

    updateDevices(cb) {
        this.unsubscribeAllIds(() => {
            this._updateDevices()
                .then(smartDevices => {
                    this.smartDevices = smartDevices;
                    this.smartDevicesSentToGoogle = this.filterValidGoogleDevices();
                    // Check KEY
                    this.checkUrlKey()
                        .then(() =>
                            this.subscribeAllIds(cb))
                        .catch(err => {
                            this.adapter.config.googleHome && this.adapter.log.warn('[GHOME] Invalid URL Pro key. Status auto-update is disabled you can set states but receive states only manually: ' + err);
                            // call cb otherwise frontend get no results
                            cb && cb();
                        });
                });
        });
    }

    getDevices() {
        const devices = Object.keys(this.smartDevices)
            .filter(device => !!this.smartDevices[device].name)
            .map(device => this.smartDevices[device]);
        return devices;
    }

    _findRoomOfId(allRooms, enums, objects, id) {
        //find room
        let roomHint = '';
        allRooms.forEach(roomId => {
            const room = enums[roomId];
            if (!room.common || !room.common.members || !room.common.members.length) return;

            // If state or channel is in some room and in some function
            let pos = room.common.members.indexOf(id);
            if (pos === -1) {
                const idArray = id.split('.');
                idArray.pop();
                const parent = idArray.join('.');
                if (objects[parent] && objects[parent].type === 'channel') {
                    pos = room.common.members.indexOf(parent);
                }

            }
            if (pos !== -1) {
                // Get the name of function (with language and if name is empty)
                let roomName = this.getSmartName(room);
                roomName = roomName || room.common.name;
                if (roomName && typeof roomName === 'object') roomName = roomName[this.lang] || roomName.en;
                if (!roomName) {
                    roomName = roomId.substring('enum.rooms.'.length);
                    roomName = roomName[0].toUpperCase() + roomName.substring(1);
                }
                roomHint = roomName;
            }
        });
        return roomHint
    }

    _updateDevices() {
        return this._readObjects()
            .then(data => {
                const {
                    objects,
                    enums
                } = data;

                let ids = Object.keys(objects);

                this.enums = [];
                this.smartDevices = {};
                this.smartNames = {};
                this.enums = [];
                this.usedIds = [];
                this.keys = [];

                ids.sort();

                // Build overlap from rooms and functions
                let rooms = [];
                let allRooms = [];
                let funcs = [];
                let smartName;
                Object.keys(enums).forEach(id => {
                    smartName = this.getSmartName(enums[id]);
                    if (id.match(/^enum\.rooms\./)) {
                        allRooms.push(id);
                        if (smartName !== 'ignore' && smartName !== false) {
                            rooms.push(id);
                        }
                    } else
                    if (id.match(/^enum\.functions\./) && smartName !== 'ignore' && smartName !== false) {
                        funcs.push(id);
                    }
                });

                let result = {};
                let roomNames = {};

                // find smart names without room or func
                this.adapter.log.debug(`[GHOME] Start non smart enum processing`);
                Object.keys(objects).forEach(id => {
                    smartName = this.getSmartName(objects[id]);
                    if (smartName && smartName !== 'ignore' && smartName !== false) {
                        const roomHint = this._findRoomOfId(allRooms, enums, objects, id);
                        this.processState(ids, objects, id, roomHint, '', result, false);
                    }
                });

                this.adapter.log.debug(`[GHOME] Start smartenum processing`);
                funcs.forEach(funcId => {
                    const func = enums[funcId];

                    if (!func.common || !func.common.members || typeof func.common.members !== 'object' || !func.common.members.length) {
                        return;
                    }
                    this.adapter.log.debug(`[GHOME] Process ${funcId}`);
                    // Get the name of function (with language and if name is empty)
                    let funcName = this.getSmartName(func);
                    funcName = funcName || func.common.name;

                    if (funcName && typeof funcName === 'object') {
                        funcName = funcName[this.lang] || funcName.en;
                    }

                    if (!funcName) {
                        funcName = funcId.substring('enum.functions.'.length);
                        funcName = funcName[0].toUpperCase() + funcName.substring(1);
                    }

                    func.common.members.forEach(id => {
                        if (!result[id]) {
                            rooms.forEach(roomId => {
                                const room = enums[roomId];

                                if (!room.common || !room.common.members || typeof func.common.members !== 'object' || !room.common.members.length) {
                                    return;
                                }

                                // If state or channel is in some room and in some function
                                const pos = room.common.members.indexOf(id);

                                if (pos !== -1) {
                                    // find name for room if not found earlier
                                    if (!roomNames[roomId]) {
                                        // Get the name of function (with language and if name is empty)
                                        let roomName = this.getSmartName(room);

                                        roomName = roomName || room.common.name;

                                        if (roomName && typeof roomName === 'object') {
                                            roomName = roomName[this.lang] || roomName.en;
                                        }

                                        if (!roomName) {
                                            roomName = roomId.substring('enum.rooms.'.length);
                                            roomName = roomName[0].toUpperCase() + roomName.substring(1);
                                        }
                                        roomNames[roomId] = roomName;
                                    }
                                    if (objects[id] && objects[id].type === 'state') {
                                        this.adapter.log.warn(`[GHOME] ${id} is a state. It's recommended to add rooms and functionality to channels or devices and not to a state to get auto detected for Google Home. This works only for simple switches.`);
                                    }
                                    this.processState(ids, objects, id, roomNames[roomId], funcName, result, true);
                                }
                            });
                        }
                    });

                });

                // scan alias.* and linkeddevices.*
                for (let i = 0; i < ids.length; i++) {
                    if (ids[i] < 'alias.') continue;
                    if (ids[i] > 'linkeddevices.\u9999') break;

                    if ((ids[i].startsWith('alias.') || ids[i].startsWith('linkeddevices.')) &&
                        objects[ids[i]] &&
                        (objects[ids[i]].type === 'device' || objects[ids[i]].type === 'channel')) {
                        const roomHint = this._findRoomOfId(allRooms, enums, objects, ids[i]);
                        if (roomHint) {
                            this.processState(ids, objects, ids[i], roomsT(this.lang, roomHint), funcsT(this.lang, 'undefined'), result, true);
                        }
                    }
                }

                this.usedIds = null;
                this.keys = null;

                Object.keys(result).forEach(id => this.adapter.log.debug(`[GHOME] ${id} => ${result[id].type}`));

                return result;
            });
    }

    async updateState(id, state) {
        const now = Date.now();
        // Only pro with valid license can update states
        if (!this.urlKeyOk || (this.unknownDevices[id] && now - this.unknownDevices[id] < RETRY_UNKNOWN_DEVICES_INTERVAL)) { // 10 minutes
            return;
        }

        let json = {};
        let found = false;
        for (const devId in this.smartDevicesSentToGoogle) {
            if (this.smartDevicesSentToGoogle.hasOwnProperty(devId)) {
                const custom = this.smartDevicesSentToGoogle[devId].customData;
                let idIsAttr = false;
                for (const attr in custom) {
                    if (custom.hasOwnProperty(attr) && attr && attr.startsWith('get_')) {
                        if (custom[attr] === id) {
                            idIsAttr = true;
                        } else {
                            continue;
                        }
                        const _attr = attr.substring(4);
                        json[devId] = json[devId] || {};
                        json[devId][_attr] = {
                            id: custom[attr]
                        };
                    }
                }

                if (!idIsAttr) {
                    continue;
                }

                for (const attr in custom) {
                    if (custom.hasOwnProperty(attr) && attr && custom[attr] === id && attr.startsWith('get_')) {
                        const _attr = attr.substring(4);
                        let val;
                        json[devId] = json[devId] || {};

                        try {
                            if (_attr === 'on') {
                                val = state.val === 1 || state.val === '1' || state.val === 'true' || state.val === 'ON' || state.val === 'on' || state.val === true || (typeof state.val === 'number' && state.val > 0);
                            } else if (_attr === 'color_R' || _attr === 'color_G' || _attr === 'color_B') {
                                const r = await this.adapter.getForeignStateAsync(json[devId]['color_R'].id);
                                const g = await this.adapter.getForeignStateAsync(json[devId]['color_G'].id);
                                const b = await this.adapter.getForeignStateAsync(json[devId]['color_B'].id);
                                const spectrumRgb = (r.val << 16) + (g.val << 8) + (b.val);

                                val = Math.floor(spectrumRgb);
                            } else if (_attr === 'color_hue') {
                                json[devId].color = json[devId].color ? json[devId].color : {};
                                const hue = await this.adapter.getForeignStateAsync(json[devId]['color_hue'].id);
                                const sat = await this.adapter.getForeignStateAsync(json[devId]['color_saturation'].id);
                                const value = await this.adapter.getForeignStateAsync(json[devId]['brightness'].id);
                                const h = hue.val / 360;
                                const s = sat.val / 255;
                                const v = value.val / 100;
                                const i = Math.floor(h * 6);
                                const f = h * 6 - i;
                                const p = v * (1 - s);
                                const q = v * (1 - f * s);
                                const t = v * (1 - (1 - f) * s);

                                let r;
                                let g;
                                let b;

                                switch (i % 6) {
                                    case 0:
                                        r = v;
                                        g = t;
                                        b = p;
                                        break;
                                    case 1:
                                        r = q;
                                        g = v;
                                        b = p;
                                        break;
                                    case 2:
                                        r = p;
                                        g = v;
                                        b = t;
                                        break;
                                    case 3:
                                        r = p;
                                        g = q;
                                        b = v;
                                        break;
                                    case 4:
                                        r = t;
                                        g = p;
                                        b = v;
                                        break;
                                    case 5:
                                        r = v;
                                        g = p;
                                        b = q;
                                        break;
                                }
                                val = Math.floor(r << 16 + g << 8 + b);
                            } else if (_attr === 'color_spectrumRGB') {
                                const rgb = state.val;
                                json[devId].color = json[devId].color ? json[devId].color : {};
                                if (rgb && rgb.substring) {
                                    val = parseInt(rgb.substring(1), 16) || 0;
                                } else {
                                    val = rgb;
                                }
                            } else if (_attr === 'color_temperature') {
                                const temp = state.val;
                                val = Math.floor(temp) || 0;
                            } else if (_attr === 'isLocked') {
                                val = !!state.val;
                            } else if (_attr === 'openDirection') {
                                val = state.val === 2 ? 'DOWN' : 'UP';
                            } else if (_attr === 'openPercent') {
                                if (state.val === true || state.val === false) {
                                    val = state.val === false ? 100 : 0;
                                } else {
                                    val = parseInt(state.val) || 0;
                                }
                            } else {
                                val = state.val;
                            }

                            if (this.smartDevices[devId].conv2GH[custom[attr]]) {
                                const conv = new Function('value', this.smartDevices[devId].conv2GH[custom[attr]]);
                                val = conv(val);
                            }
                            // do not send same state to google
                            if ((this.reportedStates[devId] && this.reportedStates[devId][_attr] && this.reportedStates[devId][_attr].val !== val) || !this.reportedStates[devId] || !this.reportedStates[devId][_attr]) {
                                this.reportedStates[devId] = this.reportedStates[devId] || {};
                                this.reportedStates[devId][_attr] = this.reportedStates[devId][_attr] || {};
                                this.reportedStates[devId][_attr].val = val;
                                this.reportedStates[devId][_attr].ts = now;
                                json[devId] = json[devId] || {};
                                if (_attr.indexOf('color_') !== -1) {
                                    json[devId].color = json[devId].color ? json[devId].color : {};
                                    if (_attr === 'color_temperature') {
                                        json[devId].color.temperatureK = Math.floor(val);
                                    } else {
                                        json[devId].color.spectrumRGB = val;
                                    }
                                } else if (_attr.substring(4).split('_').length > 1) {
                                    const attrArray = _attr.substring(4).split('_');
                                    if (json[devId][attrArray[0]]) {
                                        json[devId][attrArray[0]][attrArray[1]] = val;
                                    } else {
                                        json[devId][attrArray[0]] = {};
                                        json[devId][attrArray[0]][attrArray[1]] = val;
                                    }
                                } else {
                                    json[devId][_attr] = val;
                                }
                                found = true;
                            }
                        } catch (error) {
                            this.adapter.log.error(`[GHOME] ${error.message} ${error.stack}`);
                        }
                    }
                }
            }
        }

        if (found && this.urlKey) {
            const now = Date.now();

            let i = 0;
            while (i < this.rateCalculation.length) {
                if (now - this.rateCalculation[i] < 60000) {
                    break;
                }
                i++;
            }
            if (i) {
                if (i < this.rateCalculation.length) {
                    this.rateCalculation.splice(0, i);
                } else {
                    this.rateCalculation = [];
                }
            }

            if (this.rateCalculation.length > 60) {
                return this.adapter.log.warn(`[GHOME] Sending too fast: ${this.rateCalculation.length} in last minute!`);
            }

            this.rateCalculation.push(now);

            const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&p=${PROTOCOL_VERSION}&v=${version}`;
            request.post({
                method: 'POST',
                url,
                json
            }, (error, response, body) => {
                if (!error && response && response.statusCode === 200) {
                    if (this.unknownDevices[id]) {
                        delete this.unknownDevices[id];
                    }
                    this.adapter.log.debug(`[GHOME] Status reported:  ${JSON.stringify(json)}  ${JSON.stringify(body)}`);
                } else {
                    if (response && response.statusCode === 404) {
                        this.adapter.log.error(`[GHOME] device ${id} is unknown to google home`);
                        this.unknownDevices[id] = Date.now();
                    } else if (response && response.statusCode === 401) {
                        this.adapter.log.error(`[GHOME] auth error: ${JSON.stringify(body)}`);
                        this.urlKeyOk = false; // invalidate urlKey
                    } else if (response && response.statusCode === 410) {
                        this.adapter.log.error(`[GHOME] invalid protocol version: ${JSON.stringify(body)}`);
                        this.urlKeyOk = false; // invalidate urlKey
                    } else {
                        let errorMessage;
                        if (error) {
                            errorMessage = error;
                        } else if (body && body.error && body.error.message) {
                            errorMessage = body.error.message
                        } else if (body && body.error) {
                            errorMessage = body.error
                        } else if (body) {
                            errorMessage = body
                        }
                        this.adapter.log.error('[GHOME] Cannot updateState: ' + errorMessage);
                        this.adapter.log.debug('[GHOME] ' + JSON.stringify(json));
                    }
                }
            });
        }
    }

    async updateStates(json) {
        if (!this.urlKeyOk || !this.urlKey) {
            return;
        }
        if (!json) {
            json = {};
            for (const devId in this.smartDevicesSentToGoogle) {
                if (this.smartDevicesSentToGoogle.hasOwnProperty(devId)) {
                    const custom = this.smartDevicesSentToGoogle[devId].customData;
                    for (const attr in custom) {
                        if (custom.hasOwnProperty(attr) && attr && attr.startsWith('get_')) {
                            const _attr = attr.substring(4);
                            json[devId] = json[devId] || {};
                            json[devId][_attr] = {
                                id: custom[attr]
                            };
                        }
                    }
                }
            }
        }

        for (let devId in json) {
            try {
                if (!json.hasOwnProperty(devId)) {
                    continue;
                }

                for (let attr in json[devId]) {
                    if (!json[devId].hasOwnProperty(attr)) {
                        continue
                    }

                    if (typeof json[devId][attr] === 'object' && json[devId][attr].id) {
                        let state = await this.adapter.getForeignStateAsync(json[devId][attr].id);
                        if (state === null || state.val === null || state.val === '') {
                            delete json[devId][attr];
                            if (Object.keys(json[devId]).length === 0) {
                                delete json[devId];
                            }
                            continue;
                        }

                        state = state || {val: false};

                        if (this.smartDevices[devId].conv2GH && this.smartDevices[devId].conv2GH[json[devId][attr].id]) {
                            const conv = new Function('value', this.smartDevices[devId].conv2GH[json[devId][attr].id]);
                            state.val = conv(state.val);
                        }
                        if (attr === 'on') {
                            json[devId][attr] = state.val === 1 || state.val === '1' || state.val === 'true' || state.val === 'ON' || state.val === 'on' || state.val === true || (typeof state.val === 'number' && state.val > 0);
                        } else if (attr === 'color_R' || attr === 'color_G' || attr === 'color_B') {

                            const r = await this.adapter.getForeignStateAsync(json[devId].color_R.id);
                            const g = await this.adapter.getForeignStateAsync(json[devId].color_G.id);
                            const b = await this.adapter.getForeignStateAsync(json[devId].color_B.id);
                            const spectrumRgb = (r.val << 16) + (g.val << 8) + (b.val);
                            json[devId].color = json[devId].color ? json[devId].color : {};
                            json[devId].color.spectrumRGB = Math.floor(spectrumRgb);
                            delete json[devId]['color_R'];
                            delete json[devId]['color_G'];
                            delete json[devId]['color_B'];

                        } else if (attr === 'color_hue') {
                            json[devId].color = json[devId].color ? json[devId].color : {};
                            if (json[devId].color_hue && json[devId].color_saturation && json[devId].brightness) {
                                try {
                                    const hue = await this.adapter.getForeignStateAsync(json[devId].color_hue.id);
                                    const sat = await this.adapter.getForeignStateAsync(json[devId].color_saturation.id);
                                    const val = await this.adapter.getForeignStateAsync(json[devId].brightness.id);
                                    const h = hue.val / 360;
                                    const s = sat.val / 255;
                                    const v = val.val / 100;
                                    const i = Math.floor(h * 6);
                                    const f = h * 6 - i;
                                    const p = v * (1 - s);
                                    const q = v * (1 - f * s);
                                    const t = v * (1 - (1 - f) * s);
                                    let r, g, b;
                                    switch (i % 6) {
                                        case 0:
                                            r = v;
                                            g = t;
                                            b = p;
                                            break;
                                        case 1:
                                            r = q;
                                            g = v;
                                            b = p;
                                            break;
                                        case 2:
                                            r = p;
                                            g = v;
                                            b = t;
                                            break;
                                        case 3:
                                            r = p;
                                            g = q;
                                            b = v;
                                            break;
                                        case 4:
                                            r = t;
                                            g = p;
                                            b = v;
                                            break;
                                        case 5:
                                            r = v;
                                            g = p;
                                            b = q;
                                            break;
                                    }
                                    json[devId].color.spectrumRGB = Math.floor(r << 16 + g << 8 + b);
                                } catch(error) {
                                    this.adapter.log.error(`[GHOME] ${error}`);
                                }
                            }
                            delete json[devId]['color_hue'];
                            delete json[devId]['color_saturation'];
                            delete json[devId]['brightness'];
                        } else if (attr === 'color_spectrumRGB') {
                            const rgb = state.val;
                            json[devId].color = json[devId].color ? json[devId].color : {};
                            if (rgb && rgb.substring) {
                                json[devId].color.spectrumRGB = parseInt(rgb.substring(1), 16) || 0;
                            } else {
                                json[devId].color.spectrumRGB = rgb;
                            }

                            delete json[devId][attr];
                        } else if (attr === 'color_temperature') {
                            const temp = state.val;

                            json[devId].color = json[devId].color ? json[devId].color : {};
                            json[devId].color.temperatureK = Math.floor(temp);

                            delete json[devId][attr];
                        } else if (attr === 'isLocked') {
                            json[devId][attr] = !!state.val;
                        } else if (attr === 'openDirection') {
                            json[devId][attr] = state.val === 2 ? 'DOWN' : 'UP';
                        } else if (attr === 'openPercent') {
                            if (state.val === true || state.val === false || isNaN(state.val)) {
                                json[devId][attr] = state.val === false ? 100 : 0;
                            } else {
                                json[devId][attr] = parseInt(state.val) || 0;
                            }
                        } else if (attr === 'thermostatTemperatureSetpoint') {
                            json[devId][attr] = state.val;
                            if (json[devId].thermostatTemperatureAmbient > json[devId].thermostatTemperatureSetpoint) {
                                json[devId].thermostatMode = 'cool';
                            } else {
                                json[devId].thermostatMode = 'heat';
                            }
                        } else {
                            if (attr.split('_').length > 1) {
                                const attrArray = attr.split('_');
                                delete json[devId][attr];
                                if (json[devId][attrArray[0]]) {
                                    json[devId][attrArray[0]][attrArray[1]] = state.val;
                                } else {
                                    json[devId][attrArray[0]] = {};
                                    json[devId][attrArray[0]][attrArray[1]] = state.val;
                                }
                            } else {
                                if (!isNaN(state.val)) {
                                    state.val = Math.floor(state.val);
                                }
                                json[devId][attr] = state.val;
                            }
                        }
                        //  return;
                    }
                }
            } catch (error) {
                this.adapter.log.error(`[GHOME] ${error}`);
                this.adapter.log.error(`[GHOME] ${error.stack}`);
            }
        }

        const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&p=${PROTOCOL_VERSION}&v=${version}`;
        const sendRequest = () => {
            request.post({
                method: 'POST',
                url,
                json
            }, (error, response, body) => {
                if (!error && response && response.statusCode === 200) {
                    Object.keys(this.unknownDevices).forEach(id => {
                        if (this.unknownDevices[id]) {
                            delete this.unknownDevices[id];
                        }
                    });

                    this.adapter.log.debug(`[GHOME] Status reported: ${JSON.stringify(body)}`);
                } else {
                    if (response && response.statusCode === 404) {
                        this.adapter.log.error(`[GHOME] devices are unknown to google home`);
                        Object.keys(this.unknownDevices).forEach(id => this.unknownDevices[id] = Date.now());
                    } else if (response && response.statusCode === 401) {
                        this.adapter.log.error(`[GHOME] auth error: ${JSON.stringify(body)}`);
                        this.urlKeyOk = false; // invalidate urlKey
                    } else if (response && response.statusCode === 410) {
                        this.adapter.log.error(`[GHOME] invalid protocol version: ${JSON.stringify(body)}`);
                        this.urlKeyOk = false; // invalidate urlKey
                    } else {
                        let errorMessage;
                        if (error) {
                            errorMessage = error;
                        } else if (body && body.error && body.error.message) {
                            errorMessage = body.error.message;
                        } else if (body && body.error) {
                            errorMessage = body.error;
                        } else if (body) {
                            errorMessage = body;
                        }
                        this.adapter.log.error('[GHOME] Cannot updateStates: ' + errorMessage);
                        this.adapter.log.debug('[GHOME] ' + JSON.stringify(json));
                    }
                }
            });
        };
        setTimeout(() => sendRequest(), 100);
    }

    // https://developers.google.com/actions/smarthome/create#request
    sync(requestId) {
        this.smartDevicesSentToGoogle = {};
        let devicesArray = [];
        Object.keys(this.smartDevices).map(id => {
            if (!this.smartDevices[id].merged) {
                if (this.smartDevices[id].name && this.smartDevices[id].name.name && this.smartDevices[id].type && this.smartDevices[id].traits && this.smartDevices[id].traits.length > 0) {

                    const dev = JSON.parse(JSON.stringify(this.smartDevices[id]));
                    delete dev.displayTraits;
                    delete dev.displayAttributes;
                    delete dev.smartEnum;
                    delete dev.ioType;
                    delete dev.parentId;
                    delete dev.conv2GH;
                    delete dev.displayConv2GH;
                    delete dev.conv2iob;
                    delete dev.displayConv2iob;
                    // not yet active
                    // dev.willReportState = this.urlKeyOk;
                    devicesArray.push(dev);
                    return dev;
                } else if (!this.smartDevices[id].parentId) {
                    this.adapter.log.warn(`[GHOME] Missing name, type or treat for: ${id}. Not added to GoogleHome`);
                    this.adapter.log.debug(`[GHOME] ${JSON.stringify(this.smartDevices[id])}`)
                }
            }
            return null;
        });

        if (devicesArray.length === 0) {
            this.adapter.log.warn('[GHOME] No devices defined. Did you add not sensor or indicate states to rooms and enums?')
        }

        devicesArray.forEach(element => {
            this.smartDevicesSentToGoogle[element.id] = element;

        });
        this.tasksTimer && clearTimeout(this.tasksTimer);
        this.tasksTimer = setTimeout(() => this.updateStates(), 6000);


        return {
            requestId,
            payload: {
                agentUserId: this.agentUserId,
                devices: devicesArray
            }
        };
    }

    getStates(ids, callback, states) {
        states = states || {};
        if (!ids || !ids.length) {
            callback(states);
        } else {
            const id = ids.shift();
            if (id === undefined) {
                setImmediate(() => this.getStates(ids, callback, states));
            } else {
                this.adapter.getForeignState(id, (err, state) => {
                    states[id] = state && state.val;
                    setImmediate(() => this.getStates(ids, callback, states));
                });
            }
        }
    }

    // possible responses
    query(requestId, devices) {
        return new Promise(resolve => {

            const responseDev = {};
            const ids = [];
            try {
                devices.forEach(dev => {
                    if (this.smartDevices[dev.id]) {
                        const attrs = this.smartDevices[dev.id].customData;
                        if (attrs) {
                            Object.keys(attrs).forEach(attr => attr && attr.startsWith('get_') && attrs[attr] !== undefined && !ids.includes(attrs[attr]) && ids.push(attrs[attr]));
                        } else {
                            this.adapter.log.error(`[GHOME] No Google Home customData for ${dev.id} cannot handle Google Request.`);
                        }
                    }
                });

                this.getStates(ids, states => {
                    devices.forEach(dev => {
                        if (this.smartDevices[dev.id]) {
                            responseDev[dev.id] = {
                                online: true
                            };
                            const attrs = this.smartDevices[dev.id].customData;
                            if (attrs) {
                                Object.keys(attrs).forEach(attr => {
                                    if (attr && attr.startsWith('get_')) {
                                        if (this.smartDevices[dev.id].conv2GH[attrs[attr]]) {
                                            const conv = new Function('value', this.smartDevices[dev.id].conv2GH[attrs[attr]]);
                                            states[attrs[attr]] = conv(states[attrs[attr]]);
                                        }
                                        if (attr.substring(4).split('_').length > 1) {
                                            const attrArray = attr.substring(4).split('_');
                                            if (attr === 'get_color_R' || attr === 'get_color_G' || attr === 'get_color_B') {
                                                const spectrumRgb = (states[attrs.get_color_R] << 16) + (states[attrs.get_color_G] << 8) + (states[attrs.get_color_B]);
                                                responseDev[dev.id].color = responseDev[dev.id].color ? responseDev[dev.id].color : {};
                                                responseDev[dev.id].color.spectrumRgb = spectrumRgb;
                                            } else if (attr === 'get_color_hue') {
                                                responseDev[dev.id].color = responseDev[dev.id].color ? responseDev[dev.id].color : {};
                                                const h = states[attrs.get_color_hue] / 360;
                                                const s = states[attrs.get_color_saturation] / 255;
                                                const v = states[attrs.get_brightness] / 100;
                                                const i = Math.floor(h * 6);
                                                const f = h * 6 - i;
                                                const p = v * (1 - s);
                                                const q = v * (1 - f * s);
                                                const t = v * (1 - (1 - f) * s);
                                                let r, g, b;
                                                switch (i % 6) {
                                                    case 0:
                                                        r = v;
                                                        g = t;
                                                        b = p;
                                                        break;
                                                    case 1:
                                                        r = q;
                                                        g = v;
                                                        b = p;
                                                        break;
                                                    case 2:
                                                        r = p;
                                                        g = v;
                                                        b = t;
                                                        break;
                                                    case 3:
                                                        r = p;
                                                        g = q;
                                                        b = v;
                                                        break;
                                                    case 4:
                                                        r = t;
                                                        g = p;
                                                        b = v;
                                                        break;
                                                    case 5:
                                                        r = v;
                                                        g = p;
                                                        b = q;
                                                        break;
                                                }
                                                responseDev[dev.id].color.spectrumRgb = r << 16 + g << 8 + b;
                                            } else if (attr === 'get_color_spectrumRGB') {
                                                const rgb = states[attrs.get_color_spectrumRGB];
                                                responseDev[dev.id].color = responseDev[dev.id].color ? responseDev[dev.id].color : {};
                                                if (rgb && rgb.substring) {
                                                    responseDev[dev.id].color.spectrumRgb = parseInt(rgb.substring(1), 16) || 0;
                                                } else {
                                                    responseDev[dev.id].color.spectrumRgb = rgb;
                                                }
                                            } else {
                                                if (responseDev[dev.id][attrArray[0]]) {
                                                    responseDev[dev.id][attrArray[0]][attrArray[1]] = states[attrs[attr]];
                                                } else {
                                                    responseDev[dev.id][attrArray[0]] = {};
                                                    responseDev[dev.id][attrArray[0]][attrArray[1]] = states[attrs[attr]];
                                                }
                                            }
                                        } else {
                                            if (attr === 'get_isLocked' && states[attrs[attr]] !== true && states[attrs[attr]] !== false) {
                                                responseDev[dev.id][attr.substring(4)] = states[attrs[attr]] === 0;
                                            }
                                            if (attr === 'get_openPercent' && (states[attrs[attr]] === true || states[attrs[attr]] === false)) {
                                                responseDev[dev.id][attr.substring(4)] = states[attrs[attr]] === true ? 0 : 100;
                                            } else {
                                                responseDev[dev.id][attr.substring(4)] = states[attrs[attr]];
                                            }
                                        }
                                    }
                                });
                            } else {
                                this.adapter.log.error(`[GHOME] No Google Home customData for ${dev.id} cannot handle Google Request.`);
                            }
                            //Workaround for no thermostat mode available
                            if (responseDev[dev.id].thermostatTemperatureSetpoint) {
                                if (responseDev[dev.id].thermostatTemperatureAmbient > responseDev[dev.id].thermostatTemperatureSetpoint) {
                                    responseDev[dev.id].thermostatMode = 'cool';
                                } else {
                                    responseDev[dev.id].thermostatMode = 'heat';
                                }
                            }

                        } else {
                            responseDev[dev.id] = {
                                online: false
                            }
                        }

                        /*responseDev[dev.id] = {
                            on: true,
                            online: true,

                            brightness: 44,
                            color: {
                                name: 'soft white',
                                temperature: 2700
                            }
                        }*/
                    });
                    resolve({
                        requestId,
                        payload: {
                            devices: responseDev
                        }
                    });
                });
            } catch (error) {
                this.adapter.log.error(`[GHOME] ${error.stack}`);
                this.adapter.log.error(`[GHOME] ${JSON.stringify(devices)}`);
                this.adapter.log.error(`[GHOME] ${(ids || []).toString()}`);
            }
        });
    }

    setStates(tasks, callback, results) {
        results = results || {};
        if (!tasks || !tasks.length) {
            callback(results);
        } else {
            const task = tasks.shift();

            if (task.cmd === 'action.devices.commands.SetToggles') {
                this.adapter.getForeignState(task.id, task.val, (error, state) => {
                    if (!error) {
                        const val = !(state && state.val);
                        this.adapter.setForeignState(task.id, val, error => {
                            results[task.devId] = results[task.devId] || {};
                            results[task.devId][task.param] = val;
                            if (error) {
                                results[task.devId].error = error;
                            }
                            setImmediate(() => this.setStates(tasks, callback, results));
                        });
                    } else {
                        results[task.devId] = {
                            error
                        };
                        setImmediate(() => this.setStates(tasks, callback, results));
                    }
                });
            } else {
                this.adapter.setForeignState(task.id, task.val, error => {
                    results[task.devId] = results[task.devId] || {};
                    results[task.devId][task.param] = task.val;

                    if (error) {
                        results[task.devId].error = error;
                    }
                    setImmediate(() => this.setStates(tasks, callback, results));
                });
            }
        }
    }

    execute(requestId, commands) {
        return new Promise(resolve => {
            if (!commands) {
                this.adapter.log.error('[GHOME] Invalid parameter commands - NULL');
                resolve({
                    error: 'Invalid parameter'
                });
            }

            const tasks = [];
            commands.forEach(command => {
                command.execution.forEach(execute => {
                    console.log(`[GHOME] ${execute.command} => ${JSON.stringify(execute.params)}`);

                    command.devices.forEach(dev => {
                        if (this.smartDevices[dev.id]) {
                            const attrs = this.smartDevices[dev.id].customData;

                            if (!attrs) {
                                return this.adapter.log.error(`[GHOME] Try to control ${dev.id}, but the device is not configured for Google Home`);
                            }

                            if (execute.command === 'action.devices.commands.SetToggles') {
                                if (attrs.set_on) {
                                    tasks.push({
                                        id:    attrs.set_on,
                                        cmd:   execute.command,
                                        param: 'on',
                                        devId: dev.id
                                    });
                                }
                            } else {
                                if ((typeof execute.params === 'undefined' || execute.command === 'action.devices.commands.ActivateScene') && execute.command) {
                                    const command = execute.command.split('.').pop();
                                    execute.params = {};
                                    execute.params[command] = !execute.params.deactivate;
                                }

                                Object.keys(execute.params).forEach(param => {
                                    let paths = [];
                                    if (typeof (execute.params[param]) === 'object') {
                                        Object.keys(execute.params[param]).forEach(subElement => {
                                            if (subElement === 'spectrumRGB' && attrs.set_color_R) {
                                                const rgb = parseInt(execute.params.color.spectrumRGB) || 0;
                                                paths.push({
                                                    path: 'color_R',
                                                    val: (rgb & 0xff0000) >> 16
                                                });
                                                paths.push({
                                                    path: 'color_G',
                                                    val: (rgb & 0x00ff00) >> 8

                                                });
                                                paths.push({
                                                    path: 'color_B',
                                                    val: (rgb & 0x0000ff)
                                                })
                                            } else if (subElement === 'spectrumRGB' && attrs.set_color_hue) {
                                                const rgb = parseInt(execute.params.color.spectrumRGB) || 0;
                                                const r = ((rgb & 0xff0000) >> 16) / 255;
                                                const g = ((rgb & 0x00ff00) >> 8) / 255;
                                                const b = (rgb & 0x0000ff) / 255;

                                                const max = Math.max(r, g, b),
                                                    min = Math.min(r, g, b);
                                                let h, s, v = max;

                                                let d = max - min;
                                                s = max ? d / max : 0;

                                                if (max === min) {
                                                    h = 0; // achromatic
                                                } else {
                                                    switch (max) {
                                                        case r:
                                                            h = (g - b) / d + (g < b ? 6 : 0);
                                                            break;
                                                        case g:
                                                            h = (b - r) / d + 2;
                                                            break;
                                                        case b:
                                                            h = (r - g) / d + 4;
                                                            break;
                                                    }

                                                    h /= 6;
                                                }
                                                paths.push({
                                                    path: 'color_hue',
                                                    val: h
                                                });
                                                paths.push({
                                                    path: 'color_saturation',
                                                    val: s

                                                });
                                                paths.push({
                                                    path: 'brightness',
                                                    val: v
                                                })
                                            } else if (subElement === 'spectrumRGB') {
                                                const rgb = parseInt(execute.params.color.spectrumRGB) || 0;
                                                paths.push({
                                                    path: 'color_spectrumRGB',

                                                    val: '#' + ('000000' + (rgb).toString(16)).substr(-6)
                                                })
                                            } else {
                                                paths.push({
                                                    path: param + '_' + subElement,
                                                    val: execute.params[param][subElement]
                                                })
                                            }

                                        })
                                    } else {
                                        // if there no dedicated onoff use onoff trait and translate it to 0 : 100
                                        if (param === 'on' && attrs['set_' + param] === attrs.set_brightness) {
                                            paths.push({
                                                path: param,
                                                val: execute.params[param] ? 100 : 0
                                            })
                                        } else {
                                            paths.push({
                                                path: param,
                                                val: execute.params[param]
                                            })
                                        }
                                    }

                                    paths.forEach(element => {
                                        if (attrs['set_' + element.path]) {
                                            if (this.smartDevices[dev.id].conv2iob && this.smartDevices[dev.id].conv2iob[attrs['set_' + element.path]]) {
                                                const conv = new Function('value', this.smartDevices[dev.id].conv2iob[attrs['set_' + element.path]]);
                                                element.val = conv(element.val);
                                            }
                                            tasks.push({
                                                id: attrs['set_' + element.path],
                                                val: element.val,
                                                param,
                                                devId: dev.id
                                            });
                                        }
                                    })
                                });
                            }
                        }
                    });
                });
            });

            this.setStates(tasks, results => {
                const responseCommands = Object.keys(results).map(devId => {
                    if (results[devId].error) {
                        return {
                            ids: [devId],
                            status: 'ERROR',
                            errorCode: results[devId].error
                        }
                    } else {
                        if (results[devId].online === undefined) {
                            results[devId].online = true;
                        }
                        return {
                            ids: [devId],
                            status: 'SUCCESS',
                            states: results[devId]
                        }
                    }
                });

                resolve({
                    requestId,
                    payload: {
                        commands: responseCommands
                    }
                });
            });
        });
    }

    process(request, isEnabled, callback) {
        if (!request) {
            this.adapter.log.error('[GHOME] Invalid request: no request!');
            return;
        }

        if (!isEnabled) {
            callback({
                error: textsT(this.lang, 'The service deactivated'),
                errorCode: 501
            });
            return
        }

        if (!request.inputs) {
            callback({
                error: textsT(this.lang, 'missing inputs'),
                errorCode: 401
            });
            return
        }

        let result;

        let isWait = false;

        request.inputs.find(input => {
            let intent = input.intent;
            if (!intent) {
                callback({
                    error: textsT(this.lang, 'missing inputs'),
                    errorCode: 401
                });
                return true;
            }

            this.adapter.log.debug(`[GHOME] Received ${intent}`);

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
                    // sync
                    result = this.sync(request.requestId);
                    break;

                case 'action.devices.QUERY':
                    isWait = true;
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

                    // async
                    this.query(request.requestId, input.payload.devices)
                        .then(response => {
                            this.adapter.log.debug(`[GHOME] Response on ${intent}: ${JSON.stringify(response)}`);
                            callback(response);
                            callback = null;
                        });
                    break;

                case 'action.devices.EXECUTE':
                    isWait = true;
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

                    // async
                    this.execute(request.requestId, input.payload.commands)
                        .then(response => {
                            this.adapter.log.debug(`[GHOME] Response on ${intent}: ${JSON.stringify(response)}`);
                            callback(response);
                            callback = null;
                        });
                    break;

                case 'action.devices.DISCONNECT':
                    this.adapter.log.info('[GHOME] Google home unlinked!');
                    // sync
                    result = {};
                    break;

                default:
                    result = {
                        error: textsT(this.lang, 'missing intent'),
                        errorCode: 401
                    };
                    break;
            }

            if (result) {
                this.adapter.log.debug(`[GHOME] Response on ${intent}: ${JSON.stringify(result)}`);
                callback(result);
                callback = null;
                return true;
            }
            if (isWait) {
                return true;
            }
        });

        if (!isWait && callback) {
            callback({
                error: textsT(this.lang, 'missing inputs'),
                errorCode: 401
            });
        }
    }
}

module.exports = GoogleHome;
