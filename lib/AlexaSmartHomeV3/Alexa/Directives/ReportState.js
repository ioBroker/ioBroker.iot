const Helpers = require('../../Helpers/Utils');
const AlexaResponse = require('../AlexaResponse');
const Base = require('./Base')
/**
 * When Alexa sends an Alexa.ReportState directive to request the state of an endpoint, the skill sends an Alexa.StateReport response. 
 * This response contains the current state of all the properties that are retrievable.
 * The following information in the Alexa.StateReport response:
 * - the state of all the retrievable properties in the context object
 * - endpoint for the report is identified in the endpoint object
 * - the payload is set to an empty object 
 * - correlationToken set to the value from the Alexa.ReportState request
 * @class
 */
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