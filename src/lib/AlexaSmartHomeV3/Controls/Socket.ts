import type { AlexaV3Category } from '../types';
import PowerController from '../Alexa/Capabilities/PowerController';
import Control from './Control';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';

export default class Socket extends Control {
    get categories(): AlexaV3Category[] {
        return ['SMARTPLUG'];
    }

    initCapabilities(): CapabilitiesBase[] {
        const result = [new PowerController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject());
        }
        return result;
    }
}
