const Helpers = require('../../Helpers');
const AlexaResponse = require('../AlexaResponse');
const Base = require('./Base')

class ReportState extends Base {
    constructor() {
        super();
    }

    static matches(event) {
        return event?.directive?.header?.name === Helpers.className(this.toString());
    }

    async handle(event, endpointManager) {
        const endpointId = event.directive?.endpoint?.endpointId;

        const response = new AlexaResponse({
            namespace: 'Alexa',
            name: 'StateReport',
            correlationToken: event.directive?.header?.correlationToken,
            token: event.directive?.endpoint?.scope?.token,
            endpointId: endpointId
        });

        const endpoint = endpointManager.endpointById(endpointId);
        const properties = await endpoint.reportState();

        properties.forEach(property => {
            response.addContextProperty(property);
        })

        return response.get();
    }
}

module.exports = ReportState;