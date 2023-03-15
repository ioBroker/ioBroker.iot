const AlexaResponse = require('../AlexaResponse');
const capabilities = require('../Capabilities');
const Base = require('./Base')

class Discovery extends Base {
    constructor() {
        super();
    }

    async handle(event, endpointManager) {

        let endpoints = endpointManager.endpoints

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

        return response;
    }
}

module.exports = Discovery;