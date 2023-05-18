const https = require('https');

class Translator {
    static cache = new Map();

    static setLanguage(lang) {
        this.lang = lang;
    }

    static async translate(text) {
        let translated = Translator.cache.get(text);
        if (!translated) {
            try {
                translated = await this.translateOnTheFly(text);
                this.cache.set(text, translated);
            } catch (error) {
                // nop
            }
        }
        if (translated.hasOwnProperty(this.lang)) {
            return translated[this.lang];
        } else if (translated.hasOwnProperty('en')) {
            return translated.en;
        }
        return text;
    }

    static async translateOnTheFly(text) {
        let options = {
            hostname: 'oz7q7o4tl3.execute-api.eu-west-1.amazonaws.com',
            port: 443,
            path: '/',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const payload = JSON.stringify({ text: text });
        let translated = '';
        return new Promise((resolve, reject) => {
            let req = https.request(options, (response) => {
                response.setEncoding('utf8');
                response.on('data', (data) => {
                    translated += data;
                });
                response.on('end', () => {
                    resolve(JSON.parse(translated));
                });

                req.on('error', (e) => {
                    reject(e);
                });
            });
            req.write(payload);
            req.end();
        })
    }
}

module.exports = Translator;