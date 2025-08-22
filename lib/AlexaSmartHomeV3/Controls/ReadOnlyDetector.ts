import AlexaResponse from '../Alexa/AlexaResponse';
import Control from './Control';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import type { AlexaV3Request } from '../types';

export default class ReadOnlyDetector extends Control {
    get capability(): CapabilitiesBase | undefined {
        return undefined;
    }

    initCapabilities(): CapabilitiesBase[] {
        const result = [this.capability!];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.detectedStateInitObject());
        }
        return result;
    }

    async handle(event: AlexaV3Request): Promise<AlexaResponse> {
        this.log.error(`Setting value is not supported by ${this.name} control`);

        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        return Promise.reject(
            AlexaResponse.directiveNotSupportedByControl(
                this.name,
                event.directive.header.namespace,
                event.directive.header.messageId,
                event.directive.header.payloadVersion,
            ).get(),
        );
    }
}
