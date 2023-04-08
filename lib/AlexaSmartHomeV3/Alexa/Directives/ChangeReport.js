const Helpers = require('../../Helpers/Utils');
const AlexaResponse = require('../AlexaResponse');
const Base = require('./Base')
/**
 * When the state of an endpoint changes for any reason, we report that change to Alexa in an Alexa.ChangeReport event. 
 * Alexa can then provide the status change to the customer. 
 * In the change report we specify the state of any changed properties in the payload object. 
 * For example, if a customer manually turns on a light, we send a change report event that indicates the powerState property 
 * of the Alexa.PowerController interface has changed its value to ON.
 * 
 * If the properties of an interface are reported as proactivelyReported during discovery, 
 * we must send Alexa an Alexa.ChangeReport event whenever a property value changes. 
 * If a state change happens because of a directive from Alexa, we send both a directive response and a change report event. 
 * @class
 */
class ChangeReport extends Base {

    static matches(event) {
        return event?.directive?.header?.name === Helpers.className(this.toString());
    }

    static get(endpointId, propertyName, isPhysicalInteraction) {
        return {
            directive: {
                header: {
                    name: Helpers.className(this.toString()),
                    propertyName: propertyName,
                    physicalInteraction: isPhysicalInteraction
                },
                endpoint: {
                    endpointId: endpointId
                }
            }
        }
    }

    async handle(event, endpointManager) {
        this.log.debug(`handling ChangeReport`);
        this.log.silly(`${JSON.stringify(event)}`);

        const endpointId = event.directive?.endpoint?.endpointId;
        const propertyName = event.directive?.endpoint?.propertyName;
        const changeCauseType = event.directive?.endpoint?.physicalInteraction ? 'PHYSICAL_INTERACTION' : 'VOICE_INTERACTION';

        let response = new AlexaResponse({
            namespace: 'Alexa',
            name: 'ChangeReport',
            endpointId: endpointId,
            changeCauseType: changeCauseType
        });

        const endpoint = endpointManager.endpointById(endpointId);

        if (endpoint) {
            const properties = await endpoint.reportState();
            properties.forEach(property => {
                if (propertyName === property.name) {
                    response.addPayloadProperty(property);
                } else {
                    response.addContextProperty(property);
                }
            })
        } else {
            response = AlexaResponse.nonExistingEndpoint(endpointId);
        }

        this.log.silly(`${JSON.stringify(response.get())}`);

        return response.get();
    }
}

module.exports = ChangeReport;