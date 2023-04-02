'use strict';
const AdapterProvider = require('./AlexaSmartHomeV3/AdapterProvider');
const AlexaResponse = require('./AlexaSmartHomeV3/Alexa/AlexaResponse');
const DeviceManager = require('./AlexaSmartHomeV3/DeviceManager');
const Logger = require('./AlexaSmartHomeV3/Logger');

function AlexaSH3(adapter) {
    let lang = 'de';
    let translate = false;
    let deviceManager;
    const log = new Logger(this);
    AdapterProvider.init(adapter);

    this.setLanguage = function (_lang, _translate) {
        lang = _lang;
        translate = _translate;
    };

    this.process = async function (event) {
        log.debug(`incoming Alexa event`);
        log.silly(`${event}`);

        let response;
        let directive = deviceManager.matchDirective(event);
        if (directive) {
            response = await directive.handle(event, deviceManager);
        } else {
            let device = deviceManager.endpointById(event?.directive?.endpoint?.endpointId)
            if (device) {
                response = await device.handle(event);
            } else {
                response = AlexaResponse.directiveNotSupported().get();
            }
        }

        log.silly(`response: ${JSON.stringify(response)}`);
        return response;
    }

    this.updateDevices = async function (_addedId, callback) {
        log.debug(`initilizing device manager`);
        deviceManager = new DeviceManager(lang);
        await deviceManager.collectEndpoints();
        callback && callback();
    };
}

module.exports = AlexaSH3;