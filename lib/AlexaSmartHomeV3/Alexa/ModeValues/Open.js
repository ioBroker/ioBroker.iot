const Base = require("./Base");

class Open extends Base {
    get friendlyNames() {
        return [
            {
                '@type': 'asset',
                value: {
                    assetId: 'Alexa.Value.Open'
                }
            },
            {
                '@type': 'text',
                value: {
                    text: 'Open',
                    locale: 'en-US'
                }
            },
            {
                '@type': 'text',
                value: {
                    text: 'Geöffnet',
                    locale: 'de-DE'
                }
            }

        ]
    }

    get actionMappings() {
        return [
            {
                '@type': 'ActionsToDirective',
                actions: ['Alexa.Actions.Open'],
                directive: {
                    name: 'SetMode',
                    payload: {
                        mode: this.value
                    }
                }
            }
        ]
    }

    get stateMappings() {
        return [
            {
                '@type': 'StatesToValue',
                states: ['Alexa.States.Open'],
                value: this.value
            }
        ]
    }
}

module.exports = Open;