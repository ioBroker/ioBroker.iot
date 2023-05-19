const Base = require("./Base");

class Closed extends Base {

    get friendlyNames() {
        return [
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
}

module.exports = Closed;