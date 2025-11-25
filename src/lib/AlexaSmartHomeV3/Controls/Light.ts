import Capabilities from '../Alexa/Capabilities';
import Control, { type StateName } from './Control';
import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalPatternControl } from '../types';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
import PowerState from '../Alexa/Properties/PowerState';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';
import Brightness from '../Alexa/Properties/Brightness';

export default class Light extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        // We support dimmer as enforced capability to allow setting group commands to dim to 0% and to 100%
        // Init enforced capabilities
        const brightnessController = new Capabilities.BrightnessController(this.brightnessInitObject());
        this._enforced = [brightnessController];

        // Init capabilities
        const powerController = new Capabilities.PowerController(this.powerStateInitObject());
        this._supported = [powerController];

        const health = this.connectivityInitObject();
        if (health) {
            this._supported.push(new EndpointHealth(health));
        }
    }

    get categories(): AlexaV3Category[] {
        return ['LIGHT'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [Brightness];
    }

    get statesMap(): {
        set: StateName;
        actual: StateName;
    } {
        return {
            set: 'SET',
            actual: 'ON_ACTUAL',
        };
    }

    protected powerStateInitObject(): ControlStateInitObject {
        // const states = this.initStates(ctrl);
        const map = this.statesMap;

        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual]!,
            alexaSetter: function (alexaValue) {
                return alexaValue === PowerState.ON;
            },
            alexaGetter: function (value) {
                return value ? PowerState.ON : PowerState.OFF;
            },
            multiPurposeProperty: true,
        };
    }

    private brightnessInitObject(): ControlStateInitObject {
        const map = this.statesMap;

        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual]!,
            alexaSetter: function (alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
                return (alexaValue as number) > 0;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value ? 100 : 0;
            },
        };
    }
}
