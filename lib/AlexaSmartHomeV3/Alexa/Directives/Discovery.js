const AlexaResponse = require('../AlexaResponse');
const Base = require('./Base')

class Discovery extends Base {

    async handle(event, endpointManager) {

        this.log.debug(`handling Discovery`);
        this.log.silly(`${JSON.stringify(event)}`);

        const endpoints = endpointManager.endpoints;

        const response = new AlexaResponse({
            namespace: Discovery.namespace,
            name: 'Discover.Response'
        });

        let count = 0;

        endpoints.forEach(endpoint => {
            count++;
            if (count > 300) {
                this.log.warn(`Too many devices. Alexa supports up to 300 devices. ${endpoint.friendlyName} will not be discovered.`);
                return;
            }
            response.addPayloadEndpoint({
                endpointId: endpoint.id,
                description: endpoint.description,
                friendlyName: endpoint.friendlyName,
                displayCategories: endpoint.displayCategories,
                capabilities: endpoint.capabilities.map(capability => response.asEndpointCapability(capability.alexaResponse))
            });
        });

        this.log.silly(`${JSON.stringify(response.get())}`);

        return response.get();
    }
}

module.exports = Discovery;