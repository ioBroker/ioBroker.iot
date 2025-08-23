import { className } from '../../Helpers/Utils';
import AlexaResponse from '../AlexaResponse';
import Base from './Base';
import type { AlexaV3DirectiveType, AlexaV3EndpointID, AlexaV3Request } from '../../types';
import type DeviceManager from '../../DeviceManager';

/**
 * When the state of an endpoint changes for any reason, we report that change to Alexa in an Alexa.ChangeReport event.
 * Alexa can then provide the status change to the customer.
 * In the change report, we specify the state of any changed properties in the payload object.
 * For example, if a customer manually turns on a light, we send a change report event that indicates the powerState property
 * of the Alexa.PowerController interface has changed its value to ON.
 *
 * If the properties of an interface are reported as proactivelyReported during discovery,
 * we must send Alexa an Alexa.ChangeReport event whenever a property value changes.
 * If a state change happens because of a directive from Alexa, we send both a directive response and a change report event.
 */
export default class ChangeReport extends Base {
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.name === className(this.toString());
    }

    static get(
        endpointId: AlexaV3EndpointID,
        propertyName: string,
        isPhysicalInteraction: boolean,
        messageId: string,
    ): AlexaV3Request {
        return {
            directive: {
                header: {
                    name: className(this.toString()) as AlexaV3DirectiveType,
                    propertyName: propertyName,
                    physicalInteraction: isPhysicalInteraction,
                    messageId,
                    payloadVersion: '3',
                    namespace: 'Alexa',
                },
                endpoint: {
                    scope: {
                        type: 'BearerToken',
                        token: '',
                    },
                    endpointId,
                },
                payload: {},
            },
        };
    }

    async handle(event: AlexaV3Request, endpointManager: DeviceManager): Promise<AlexaResponse> {
        this.log.debug(`handling ChangeReport`);
        this.log.silly(`${JSON.stringify(event)}`);

        const endpointId = event.directive?.endpoint?.endpointId;
        const propertyName = event.directive?.header?.propertyName;
        const changeCauseType = event.directive?.header?.physicalInteraction
            ? 'PHYSICAL_INTERACTION'
            : 'VOICE_INTERACTION';

        let response = new AlexaResponse({
            namespace: 'Alexa',
            name: 'ChangeReport',
            messageId: event?.directive?.header?.messageId,
            endpointId,
            changeCauseType,
        });

        response.addContext();

        const endpoint = endpointId ? endpointManager.endpointById(endpointId) : null;

        if (endpoint?.reportState) {
            const properties = await endpoint.reportState();
            for (const property of properties) {
                if (propertyName === property.name) {
                    response.addPayloadChangeProperty(property);
                } else {
                    response.addContextProperty(property);
                }
            }
        } else {
            response = AlexaResponse.nonExistingEndpoint(event.directive.header.messageId, endpointId);
        }

        this.log.debug(`${JSON.stringify(response.get())}`);

        return response.get();
    }
}
