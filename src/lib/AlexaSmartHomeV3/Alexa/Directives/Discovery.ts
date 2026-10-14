import AlexaResponse from '../AlexaResponse';
import Base from './Base';
import type { AlexaV3Request } from '../../types';
import type DeviceManager from '../../DeviceManager';
import { validateDiscoveryResponse } from '../../Helpers/DiscoveryValidator';
import type Device from '../../Device';
import type Logger from '../../Helpers/Logger';

export default class Discovery extends Base {
    static isSensorInterface(iface: unknown): boolean {
        return typeof iface === 'string' && iface.endsWith('Sensor');
    }

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
            // Sensor capabilities (e.g. Alexa.TemperatureSensor, HumiditySensor,
            // MotionSensor, ContactSensor) must stay retrievable so Alexa can
            // answer queries like "What's the temperature in the kitchen?".
            if (Discovery.isSensorInterface(obj.interface)) {
                return obj;
            }

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

        return Promise.resolve(
            Discovery.discoveryResponse(endpointManager.endpoints, this.log, event?.directive?.header?.messageId),
        );
    }

    /**
     * Describes the devices exactly as Alexa gets them on discovery. The proactive Alexa.Discovery reports use it
     * too, so Alexa never learns two different versions of the same device.
     *
     * @param endpoints all collected devices
     * @param log logger for the warnings
     * @param messageId message ID of the Discover directive, if any
     */
    static discoveryResponse(endpoints: Device[], log: Logger, messageId?: string): AlexaResponse {
        const response = new AlexaResponse({
            namespace: Discovery.namespace,
            name: 'Discover.Response',
            messageId,
        });

        let count = 0;

        endpoints.forEach(endpoint => {
            count++;
            if (count > 300) {
                log.warn(
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

        // To do, activate it again after status report will work
        //if (endpointManager.validTill <= Date.now()) {
        Discovery.setAllProactiveAndRetrievableFalse(json);
        //}

        validateDiscoveryResponse(json, log);

        return json;
    }
}
