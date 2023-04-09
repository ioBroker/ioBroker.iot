const https = require('https');
const Light = require('../../lib/AlexaSmartHomeV3/Controls/Light');
const Dimmer = require('../../lib/AlexaSmartHomeV3/Controls/Dimmer');

class AdapterMock {
    constructor() {
        this.log = {
            silly: this.nop,
            debug: this.nop,
            info: this.nop,
            warn: this.nop,
            error: this.nop
        }
    }

    nop() {
        // left blank intentionally
    }

    async getObjectViewAsync() {
        return { rows: [] };
    }
    async setStateAsync() {
        return {}
    }

    async setForeignStateAsync() {
        return {}
    }

    async getForeignStateAsync(id) {
        if (id.includes('Lampe')) {
            return { val: true }
        }

        if (id.includes('Dimmer')) {
            return { val: 875 }
        }
    }
}

module.exports = {
    adapterMock: function () {
        return new AdapterMock()
    },

    dimmerControl: function () {
        return new Dimmer(
            {
                states: [
                    {
                        name: "SET",
                        defaultRole: "level.dimmer",
                        defaultUnit: "%",
                        id: "alias.0.Wohnzimmer.Dimmer.SET",
                        smartName: {
                            smartType: "LIGHT",
                            byON: "80",
                        },
                    },
                ],
                type: "dimmer",
                object: {
                    id: "alias.0.Wohnzimmer.Dimmer",
                    common: {
                        name: {
                            de: "Dimmer",
                        },
                        role: "dimmer",
                        max: 1000,
                        min: 500
                    },
                },
                room: {
                    id: "enum.rooms.living_room",
                    common: {
                        name: {
                            en: "Living Room",
                        },
                        members: [
                            "alias.0.Wohnzimmer.Dimmer",
                            "alias.0.Wohnzimmer.Lampe",
                        ],
                    },
                },
                functionality: undefined,
            });
    },

    lightControl: function () {
        return new Light(
            {
                states: [
                    {
                        name: "SET",
                        defaultRole: "switch.light",
                        id: "alias.0.Wohnzimmer.Lampe.SET",
                        smartName: {
                            smartType: "LIGHT",
                        },
                    },
                ],
                type: "light",
                object: {
                    id: "alias.0.Wohnzimmer.Lampe",
                    common: {
                        name: {
                            de: "Lampe",
                        },
                        role: "light",
                        smartName: {
                            de: "Meine Lampe",
                        },
                    },
                },
                room: {
                    id: "enum.rooms.living_room",
                    common: {
                        name: {
                            en: "Living Room",
                        },
                        members: [
                            "alias.0.Wohnzimmer.Dimmer",
                            "alias.0.Wohnzimmer.Lampe",
                        ],
                    },
                },
                functionality: {
                    id: "enum.functions.light",
                    common: {
                        name: {
                            en: "Light",
                        },
                        members: [
                            "alias.0.Wohnzimmer.Lampe",
                            "0_userdata.0.Blinds",
                        ]
                    }
                }
            });
    },

    getSample: async function (sample_json_name) {
        let options = {
            hostname: 'raw.githubusercontent.com',
            port: 443,
            path: '/alexa/alexa-smarthome/master/sample_messages/' + sample_json_name,
            headers: { 'Content-Type': 'application/json' }
        };

        let json_string = '';
        return new Promise((resolve, reject) => {
            let req = https.request(options, (res) => {
                res.setEncoding('utf8');
                res.on('data', (data) => {
                    json_string += data;
                });

                res.on('end', () => {
                    resolve(JSON.parse(json_string));
                });

                req.on('error', (e) => {
                    reject(e);
                });

            });

            req.end();
        })
    }
}

