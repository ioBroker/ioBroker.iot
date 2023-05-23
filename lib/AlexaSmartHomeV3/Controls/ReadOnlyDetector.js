const AlexaResponse = require('../Alexa/AlexaResponse');
const Control = require('./Control');

/**
 * @class
 */
class ReadOnlyDetector extends Control {

    get capability() {
        return undefined;
    }

    initCapabilities() {
        let result = [this.capability];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.detectedStateInitObject())
        }
        return result;
    }
    async handle(event) {
        this.log.error(`Setting value is not supported by ${this.name} control`);
        return Promise.reject(AlexaResponse.directiveNotSupportedByControl(this.name, event?.directive?.header?.namespace, event?.directive?.header?.payloadVersion).get());
    }
}

module.exports = ReadOnlyDetector;