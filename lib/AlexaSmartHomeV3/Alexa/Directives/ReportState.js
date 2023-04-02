const Helpers = require('../../Helpers');
const AlexaResponse = require('../AlexaResponse');
const Base = require('./Base')

class ReportState extends Base {

    static matches(event) {
        return event?.directive?.header?.name === Helpers.className(this.toString());
    }

    async handle(event, endpointManager) {

        this.log.debug(`handling ReportState`);
        this.log.silly(`${JSON.stringify(event)}`);

        const endpointId = event.directive?.endpoint?.endpointId;

        let response = new AlexaResponse({
            namespace: 'Alexa',
            name: 'StateReport',
            correlationToken: event.directive?.header?.correlationToken,
            token: event.directive?.endpoint?.scope?.token,
            endpointId: endpointId
        });

        const endpoint = endpointManager.endpointById(endpointId);

        if (endpoint) {
            const properties = await endpoint.reportState();
            properties.forEach(property => {
                response.addContextProperty(property);
            })
        } else {
            response = AlexaResponse.nonExistingEndpoint(endpointId);
        }

        this.log.silly(`${JSON.stringify(response.get())}`);

        return response.get();
    }
}

module.exports = ReportState;