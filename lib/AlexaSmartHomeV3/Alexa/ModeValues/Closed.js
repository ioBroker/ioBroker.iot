const Base = require("./Base");

class Closed extends Base {
    get friendlyNames() {
        return [
            {
                '@type': 'asset',
                'value': {
                    assetId: 'Alexa.Value.Close'
                }
            },
            {
                '@type': 'text',
                value: {
                    text: 'Closed',
                    locale: 'en-US'
                }
            },
            {
                '@type': 'text',
                value: {
                    text: 'Geschloßen',
                    locale: 'de-DE'
                }
            }
        ]
    }

    get actionMappings() {
        return [
            {
                '@type': 'ActionsToDirective',
                actions: ['Alexa.Actions.Close'],
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
                states: ['Alexa.States.Closed'],
                value: this.value
            }
        ]
    }
}

module.exports = Closed;