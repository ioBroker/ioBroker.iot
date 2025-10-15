import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import Capabilities from '../Alexa/Capabilities';
import Control, { type StateName } from './Control';

export default class VacuumCleaner extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const powerController = new Capabilities.PowerController(this.powerStateInitObject());
        this._supported = [powerController];
    }

    get categories(): AlexaV3Category[] {
        return ['VACUUM_CLEANER'];
    }

    get statesMap(): {
        set: StateName;
        actual?: StateName;
    } {
        return {
            set: 'POWER',
            actual: undefined,
        };
    }
}
