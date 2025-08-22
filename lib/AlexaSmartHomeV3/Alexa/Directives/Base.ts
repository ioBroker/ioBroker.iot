import Logger from '../../Helpers/Logger';
import { className } from '../../Helpers/Utils';
import type { AlexaV3Namespace, AlexaV3Request } from '../../types';
import type AlexaResponse from '../AlexaResponse';
import type DeviceManager from '../../DeviceManager';

export default class Base {
    protected log: Logger;

    constructor() {
        this.log = new Logger(this);
    }

    static get namespace(): AlexaV3Namespace {
        return `Alexa.${className(this.toString())}` as AlexaV3Namespace;
    }

    /**
     * Checks whether the directive matches, i.e., can handle the event Alexa sends to the skill
     *
     * @param event Contains the Alexa event.
     */
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === this.namespace;
    }

    handle(_event: AlexaV3Request, _endpointManager: DeviceManager): Promise<null | AlexaResponse> {
        return Promise.resolve(null);
    }
}
