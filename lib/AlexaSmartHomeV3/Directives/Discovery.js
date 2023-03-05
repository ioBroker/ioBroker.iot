const AlexaResponse = require('../AlexaResponse');
const capabilities = require('../Capabilities');
const Base = require('./Base')

class Discovery extends Base {
    constructor() {
        super();
    }

    async handle(event, deviceManager) {

        let devices = deviceManager.knownDevices

        const response = new AlexaResponse({
            namespace: Discovery.namespace,
            name: 'Discover.Response'
        });

        devices.forEach(device => {
            response.addPayloadEndpoint({
                endpointId: device.id,
                description: device.description,
                friendlyName: device.friendlyName,
                displayCategories: device.displayCategories,
                capabilities: device.capabilities.map(capability => response.asEndpointCapability(capability.alexaResponse))
            })

        });

        return response;
    }
}

module.exports = Discovery;