import type { AlexaV3Category } from '../types';
import Capabilities from '../Alexa/Capabilities';
import Control from './Control';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';

export default class VacuumCleaner extends Control {
    get categories(): AlexaV3Category[] {
        return ['VACUUM_CLEANER'];
    }

    initCapabilities(): CapabilitiesBase[] {
        const result = [new Capabilities.PowerController()];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.powerStateInitObject());
        }
        return result;
    }

    get statesMap(): {
        set: string;
        actual?: string;
    } {
        return {
            set: 'POWER',
            actual: undefined,
        };
    }
}
