'use strict';
const AlexaResponse = require('./AlexaSmartHomeV3/Alexa/AlexaResponse');
const DeviceManager = require('./AlexaSmartHomeV3/DeviceManager');
let deviceManager;

function AlexaSH3(adapter) {
    let lang          = 'de';
    let translate = false;

    this.setLanguage = function (_lang, _translate) {
        lang = _lang;
        translate = _translate;
    };

    this.process = async function (event) {
        let directive = deviceManager.matchDirective(event);
        if (directive) {
            const response = await directive.handle(event, deviceManager);
            return response;
        }

        let device = deviceManager.endpointById(event?.directive?.endpoint?.endpointId)
        if (device) {
            const response = await device.handle(event);
            return response;
        }

        return AlexaResponse.directiveNotSupported().get()
    }

    this.updateDevices = async function (_addedId, callback) {
        deviceManager = new DeviceManager(adapter, lang);
        await deviceManager.collectEndpoints();
        callback && callback();
    };
}

module.exports = AlexaSH3;