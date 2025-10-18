import { configuredRangeOrDefault, firstLower, className } from '../../Helpers/Utils';
import type {
    AlexaV3DirectiveName,
    AlexaV3DirectiveValue,
    AlexaV3Request,
    IotExternalDetectorState,
} from '../../types';

export type ControlStateInitObject = {
    setState?: IotExternalDetectorState;
    getState?: IotExternalDetectorState;
    alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
    alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    multiPurposeProperty?: boolean;
    // Level below which the dimmer or percent based control means "off"
    offValue?: number;

    // Extra for Hue control
    hal?: {
        hue: IotExternalDetectorState;
        saturation?: IotExternalDetectorState;
        brightness?: IotExternalDetectorState;
    };

    // Extra for Mode control
    supportedModes?: any[];
    instance?: string;

    // Extra for rgb(w) control
    rgbw?:
        | IotExternalDetectorState
        | {
              red: IotExternalDetectorState;
              green: IotExternalDetectorState;
              blue: IotExternalDetectorState;
              white: IotExternalDetectorState;
          };
    rgb?:
        | IotExternalDetectorState
        | {
              red: IotExternalDetectorState;
              green: IotExternalDetectorState;
              blue: IotExternalDetectorState;
          };
};

export class Base {
    #setState: IotExternalDetectorState | null = null;
    protected _setId: string = '';
    protected _getId: string = '';
    #valuesRange: { min: number | boolean; max: number | boolean } = { min: 0, max: 100 };
    protected _stateType: ioBroker.CommonType | undefined;
    #currentValue: ioBroker.StateValue | undefined;
    protected _alexaSetter?: (value: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
    protected _alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
    #instance?: string;
    protected _supportedModesAsEnum: Record<string, number | string> = {};
    protected _multiPurposeProperty: boolean = false;
    protected _offValue: number = 30;

    /**
     * @param opts The object to initialize the corresponding ioBroker state.
     * @param opts.setState The iobroker state to write values to.
     * @param opts.getState The iobroker state to read values from.
     * @param opts.alexaSetter The function to apply to an Alexa value to transform it to the iobroker's one
     * @param opts.alexaGetter The function to apply to an iobroker value to transform it to the Alexa's one
     * @param ignoreStandard If the standard checks should be ignored (used for Color control)
     */
    constructor(opts: ControlStateInitObject, ignoreStandard?: boolean) {
        if (!ignoreStandard) {
            if (!opts.setState) {
                throw new Error(`missing setState in ${this.constructor.name}`);
            }
            this._multiPurposeProperty = !!opts.multiPurposeProperty;
            this.#setState = opts.setState;
            this._offValue = opts.offValue || 30;
            this._setId = opts.setState.id;
            this._getId = opts.getState?.id || this._setId;
            this._stateType = opts.setState.common?.type;
            this.#valuesRange = configuredRangeOrDefault(this.#setState);
            this.#instance = opts.instance;
        }

        if (opts.alexaSetter) {
            this._alexaSetter = opts.alexaSetter;
        }
        if (opts.alexaGetter) {
            this._alexaGetter = opts.alexaGetter;
        }
    }

    get instance(): string | undefined {
        return this.#instance;
    }

    getSetState(): IotExternalDetectorState | null {
        return this.#setState;
    }

    get propertyName(): string {
        return firstLower(`${this.constructor.name}`);
    }

    static get propertyName(): string {
        return firstLower(className(this.toString()));
    }

    get valuesRangeMin(): number | boolean {
        return this.#valuesRange.min;
    }

    get valuesRangeMax(): number | boolean {
        return this.#valuesRange.max;
    }

    get setId(): string {
        return this._setId;
    }

    get getId(): string {
        return this._getId;
    }
    /**
     * returns last known iobroker value
     */
    get currentValue(): ioBroker.StateValue | undefined {
        return this.#currentValue;
    }

    set currentValue(value: ioBroker.StateValue | undefined) {
        this.#currentValue = value;
    }

    value(alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
        return this._alexaSetter && typeof alexaValue === 'number'
            ? this._alexaSetter(alexaValue)
            : (alexaValue as ioBroker.StateValue | undefined);
    }

    alexaValue(value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        return this._alexaGetter && typeof value === 'number'
            ? this._alexaGetter(value)
            : (value as AlexaV3DirectiveValue);
    }

    static directive(_event: AlexaV3Request): AlexaV3DirectiveName {
        return Base.SET;
    }

    /**
     * Checks whether a directive refers to the property
     *
     * @param event Contains the Alexa event.
     */
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === `Alexa.${className(this.toString())}Controller`;
    }

    matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.name === this.propertyName;
    }

    /**
     * Extracts value to be set on the smart device sent in an Alexa directive
     */
    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        if (this.propertyName === 'color') {
            return event.directive.payload.color;
        }
        if (this.propertyName === 'colorTemperatureInKelvin') {
            return event.directive.payload.colorTemperatureInKelvin;
        }
        if (this.propertyName === 'brightness') {
            return event.directive.payload.brightness;
        }
        // @ts-expect-error fix later
        return event.directive.payload[this.propertyName];
    }

    reportValue(value: AlexaV3DirectiveValue): any {
        return value;
    }

    static get ADJUST(): AlexaV3DirectiveName {
        return 'ADJUST';
    }

    static get SET(): AlexaV3DirectiveName {
        return 'SET';
    }

    static get CELSIUS_SCALE(): AlexaV3DirectiveName {
        return 'CELSIUS';
    }

    get supportedModesAsEnum(): Record<string, number | string> {
        return this._supportedModesAsEnum;
    }
}

export default Base;
