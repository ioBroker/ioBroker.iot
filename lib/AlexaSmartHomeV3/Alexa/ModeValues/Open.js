const Base = require("./Base");

class Open extends Base {

    get friendlyNames() {
        return [
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
}

module.exports = Open;