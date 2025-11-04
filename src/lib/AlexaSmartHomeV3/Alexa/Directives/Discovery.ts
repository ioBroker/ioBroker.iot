import AlexaResponse from '../AlexaResponse';
import Base from './Base';
import type { AlexaV3Request } from '../../types';
import type DeviceManager from '../../DeviceManager';

export default class Discovery extends Base {
    static setAllProactiveAndRetrievableFalse(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                Discovery.setAllProactiveAndRetrievableFalse(obj[i]);
            }
            return obj;
        }

        if (typeof obj === 'object') {
            for (const key of Object.keys(obj)) {
                if (key === 'proactivelyReported' || key === 'retrievable') {
                    obj[key] = false;
                } else {
                    Discovery.setAllProactiveAndRetrievableFalse(obj[key]);
                }
            }
        }

        return obj;
    }

    handle(event: AlexaV3Request, endpointManager: DeviceManager): Promise<AlexaResponse> {
        this.log.debug(`handling Discovery`);
        this.log.silly(`${JSON.stringify(event)}`);

        const endpoints = endpointManager.endpoints;

        const response = new AlexaResponse({
            namespace: Discovery.namespace,
            name: 'Discover.Response',
            messageId: event?.directive?.header?.messageId,
        });

        let count = 0;

        endpoints.forEach(endpoint => {
            count++;
            if (count > 300) {
                this.log.warn(
                    `Too many devices. Alexa supports up to 300 devices. ${endpoint.friendlyName} will not be discovered.`,
                );
                return;
            }
            response.addPayloadEndpoint({
                endpointId: endpoint.id,
                description: endpoint.description || undefined,
                friendlyName: endpoint.friendlyName,
                displayCategories: endpoint.displayCategories || [],
                capabilities:
                    endpoint.capabilities?.map(capability => response.asEndpointCapability(capability.alexaResponse)) ||
                    [],
            });
        });

        const json = response.get();

        this.log.silly(`${JSON.stringify(response.get())}`);

        if (endpointManager.validTill <= Date.now()) {
            Discovery.setAllProactiveAndRetrievableFalse(json);
        }

        return Promise.resolve(json);
    }
}
