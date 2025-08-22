import type { AlexaV3SmartHomeRequestEnvelope } from '../../types';
import { className } from '../../Helpers/Utils';
import AlexaResponse from '../AlexaResponse';
import Base from './Base';
import type DeviceManager from '../../DeviceManager';

/**
 * When Alexa sends an Alexa.ReportState directive to request the state of an endpoint, the skill sends an Alexa.StateReport response.
 * This response contains the current state of all the properties that are retrievable.
 * The following information in the Alexa.StateReport response:
 * - the state of all the retrievable properties in the context object
 * - endpoint for the report is identified in the endpoint object
 * - the payload is set to an empty object
 * - correlationToken set to the value from the Alexa.ReportState request
 */
export default class ReportState extends Base {
    static matches(event: AlexaV3SmartHomeRequestEnvelope): boolean {
        return event?.directive?.header?.name === className(this.toString());
    }

    async handle(event: AlexaV3SmartHomeRequestEnvelope, endpointManager: DeviceManager): Promise<AlexaResponse> {
        this.log.debug(`handling ReportState`);
        this.log.silly(`${JSON.stringify(event)}`);

        const endpointId = event.directive?.endpoint?.endpointId;

        let response = new AlexaResponse({
            namespace: 'Alexa',
            name: 'StateReport',
            correlationToken: event.directive?.header?.correlationToken,
            token: event.directive?.endpoint?.scope?.token,
            messageId: event.directive?.header?.messageId,
            endpointId,
        });

        const endpoint = endpointId ? endpointManager.endpointById(endpointId) : null;

        if (endpoint?.reportState) {
            const properties: Record<string, any>[] = await endpoint.reportState();
            properties.forEach(property => response.addContextProperty(property));
        } else {
            response = AlexaResponse.nonExistingEndpoint(event.directive.header.messageId, endpointId);
        }

        this.log.silly(`${JSON.stringify(response.get())}`);

        return response.get();
    }
}
