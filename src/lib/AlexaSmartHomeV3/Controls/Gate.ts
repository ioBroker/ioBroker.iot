import Capabilities from '../Alexa/Capabilities';
import Modes from '../Alexa/ModeValues';
import Control from './Control';
import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import type { ControlStateInitObject } from '../Alexa/Properties/Base';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

export default class Gate extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);
        const modeController = new Capabilities.ModeController(this.modeInitObject());
        this._supported = [modeController];

        const health = this.connectivityInitObject();
        if (health) {
            this._supported.push(new EndpointHealth(health));
        }
    }

    get categories(): AlexaV3Category[] {
        return ['GARAGE_DOOR'];
    }

    private modeInitObject(): ControlStateInitObject {
        const map = this.statesMap;
        const mode = 'Gate.Position';

        return {
            setState: this.states[map.set]!,
            getState: this.states[map.set]!,
            alexaSetter: function (alexaValue) {
                return alexaValue === `${mode}.${Modes.Open.value}`;
            },
            alexaGetter: function (value) {
                return value ? `${mode}.${Modes.Open.value}` : `${mode}.${Modes.Closed.value}`;
            },
            instance: mode,
            supportedModes: [new Modes.Open(mode), new Modes.Closed(mode)],
        };
    }
}
