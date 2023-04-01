const AlexaResponse = require('../AlexaResponse');
const Base = require('./Base')

class Discovery extends Base {
    constructor() {
        super();
    }

    async handle(event, endpointManager) {
        const endpoints = endpointManager.endpoints;

        const response = new AlexaResponse({
            namespace: Discovery.namespace,
            name: 'Discover.Response'
        });

        endpoints.forEach(endpoint => {
            response.addPayloadEndpoint({
                endpointId: endpoint.id,
                description: endpoint.description,
                friendlyName: endpoint.friendlyName,
                displayCategories: endpoint.displayCategories,
                capabilities: endpoint.capabilities.map(capability => response.asEndpointCapability(capability.alexaResponse))
            })

        });

        return response.get();
    }
}

module.exports = Discovery;