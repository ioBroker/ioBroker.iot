const https = require('https');

module.exports = {
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

