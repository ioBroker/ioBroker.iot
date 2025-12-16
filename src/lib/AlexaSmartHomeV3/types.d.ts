// we extend this type for our use
import type { InternalDetectorState, Types } from '@iobroker/type-detector/types';

export type AlexaV3EndpointID = string;

export type AlexaV3ThermostatMode =
    | 'AUTO' // Automatic heating or cooling based on the current temperature and the setpoint.
    | 'COOL' // Cooling mode.
    | 'ECO' // Economy mode.
    | 'EM_HEAT' // Emergency heating mode. This mode uses a backup heat source as an additional heat source. For example, a customer might use emergency heat when it's really cold or when the heat pump is broken. Customers can set this mode in device settings in the Alexa app.
    | 'HEAT' // Heating mode.
    | 'OFF'; // Heating and cooling are off, but the device might still have power.;

export type AlexaV3DirectiveValue =
    | string
    | number
    | boolean
    | undefined
    | {
          hue: number;
          saturation: number;
          brightness: number;
      };

export type AlexaV3DirectiveName =
    | 'ADJUST'
    | 'SET'
    | 'CELSIUS'
    | 'DETECTED'
    | 'NOT_DETECTED'
    | 'JAMMED'
    | 'UNLOCKED'
    | 'ON'
    | 'OFF'
    | 'LOCKED';

// https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-discovery.html#display-categories
export type AlexaV3Category =
    | 'ACTIVITY_TRIGGER'
    | 'AIR_CONDITIONER'
    | 'AIR_FRESHENER'
    | 'AIR_PURIFIER'
    | 'AIR_QUALITY_MONITOR'
    | 'ALEXA_VOICE_ENABLED'
    | 'AUTO_ACCESSORY'
    | 'BLUETOOTH_SPEAKER'
    | 'CAMERA'
    | 'CHRISTMAS_TREE'
    | 'COFFEE_MAKER'
    | 'COMPUTER'
    | 'CONTACT_SENSOR'
    | 'DISHWASHER'
    | 'DOOR'
    | 'DOORBELL'
    | 'DRYER'
    | 'EXTERIOR_BLIND'
    | 'FAN'
    | 'GAME_CONSOLE'
    | 'GARAGE_DOOR'
    | 'HEADPHONES'
    | 'HUB'
    | 'INTERIOR_BLIND'
    | 'LAPTOP'
    | 'LIGHT'
    | 'MICROWAVE'
    | 'MOBILE_PHONE'
    | 'MOTION_SENSOR'
    | 'MUSIC_SYSTEM'
    | 'NETWORK_HARDWARE'
    | 'OTHER'
    | 'OVEN'
    | 'PHONE'
    | 'PRINTER'
    | 'REMOTE'
    | 'ROUTER'
    | 'SCENE_TRIGGER'
    | 'SCREEN'
    | 'SECURITY_PANEL'
    | 'SECURITY_SYSTEM'
    | 'SLOW_COOKER'
    | 'SMARTLOCK'
    | 'SMARTPLUG'
    | 'SPEAKER'
    | 'STREAMING_DEVICE'
    | 'SWITCH'
    | 'TABLET'
    | 'TEMPERATURE_SENSOR'
    | 'THERMOSTAT'
    | 'TV'
    | 'VACUUM_CLEANER'
    | 'VACUUM'
    | 'VEHICLE'
    | 'WASHER'
    | 'WATER_HEATER'
    | 'WEARABLE';

// https://developer.amazon.com/en-US/docs/alexa/device-apis/resources-and-assets.html
export type AlexaV3AssetName =
    | 'Alexa.Actions.Charge'
    | 'Alexa.Actions.Clean'
    | 'Alexa.Actions.Dispense'
    | 'Alexa.Actions.Dock'
    | 'Alexa.Actions.Empty'
    | 'Alexa.Actions.Mop'
    | 'Alexa.Actions.Skip'
    | 'Alexa.Actions.Sweep'
    | 'Alexa.Actions.Vacuum'
    | 'Alexa.Button.OffButton'
    | 'Alexa.Button.OnButton'
    | 'Alexa.Button.BrightenButton'
    | 'Alexa.Button.DimButton'
    | 'Alexa.Button.MainButton'
    | 'Alexa.Button.TopButton'
    | 'Alexa.Button.BottomButton'
    | 'Alexa.Button.CenterButton'
    | 'Alexa.Button.MiddleButton'
    | 'Alexa.Button.UpButton'
    | 'Alexa.Button.DownButton'
    | 'Alexa.Button.LeftButton'
    | 'Alexa.Button.RightButton'
    | 'Alexa.Button.FirstButton'
    | 'Alexa.Button.SecondButton'
    | 'Alexa.Button.ThirdButton'
    | 'Alexa.Button.FourthButton'
    | 'Alexa.Button.FifthButton'
    | 'Alexa.Button.SixthButton'
    | 'Alexa.Button.SeventhButton'
    | 'Alexa.Button.EighthButton'
    | 'Alexa.Button.DoublePress'
    | 'Alexa.Button.DoublePush'
    | 'Alexa.Button.LongPress'
    | 'Alexa.Button.LongPush'
    | 'Alexa.Button.SinglePress'
    | 'Alexa.Button.SinglePush'
    | 'Alexa.DeviceName.AirPurifier'
    | 'Alexa.DeviceName.Camera'
    | 'Alexa.DeviceName.Fan'
    | 'Alexa.DeviceName.Router'
    | 'Alexa.DeviceName.Shade'
    | 'Alexa.DeviceName.Shower'
    | 'Alexa.DeviceName.SpaceHeater'
    | 'Alexa.DeviceName.Washer'
    | 'Alexa.Gesture.DoubleClick'
    | 'Alexa.Gestures.DoubleTap'
    | 'Alexa.Gesture.SingleClick'
    | 'Alexa.Gesture.SwipeDown'
    | 'Alexa.Gesture.SwipeLeft'
    | 'Alexa.Gesture.SwipeRight'
    | 'Alexa.Gesture.SwipeUp'
    | 'Alexa.Gesture.Tap'
    | 'Alexa.Setting.2GGuestWiFi'
    | 'Alexa.Setting.5GGuestWiFi'
    | 'Alexa.Setting.Auto'
    | 'Alexa.Setting.Direction'
    | 'Alexa.Setting.DryCycle'
    | 'Alexa.Setting.FanSpeed'
    | 'Alexa.Setting.GuestWiFi'
    | 'Alexa.Setting.Heat'
    | 'Alexa.Setting.Mode'
    | 'Alexa.Setting.Night'
    | 'Alexa.Setting.Opening'
    | 'Alexa.Setting.Oscillate'
    | 'Alexa.Setting.Preset'
    | 'Alexa.Setting.Quiet'
    | 'Alexa.Setting.Temperature'
    | 'Alexa.Setting.WashCycle'
    | 'Alexa.Setting.WaterTemperature'
    | 'Alexa.Shower.HandHeld'
    | 'Alexa.Shower.RainHead'
    | 'Alexa.Unit.Angle.Degrees'
    | 'Alexa.Unit.Angle.Radians'
    | 'Alexa.Unit.Distance.Feet'
    | 'Alexa.Unit.Distance.Inches'
    | 'Alexa.Unit.Distance.Kilometers'
    | 'Alexa.Unit.Distance.Meters'
    | 'Alexa.Unit.Distance.Miles'
    | 'Alexa.Unit.Distance.Yards'
    | 'Alexa.Unit.Mass.Grams'
    | 'Alexa.Unit.Mass.Kilograms'
    | 'Alexa.Unit.Percent'
    | 'Alexa.Unit.Temperature.Celsius'
    | 'Alexa.Unit.Temperature.Degrees'
    | 'Alexa.Unit.Temperature.Fahrenheit'
    | 'Alexa.Unit.Temperature.Kelvin'
    | 'Alexa.Unit.Volume.CubicFeet'
    | 'Alexa.Unit.Volume.CubicMeters'
    | 'Alexa.Unit.Volume.Gallons'
    | 'Alexa.Unit.Volume.Liters'
    | 'Alexa.Unit.Volume.Pints'
    | 'Alexa.Unit.Volume.Quarts'
    | 'Alexa.Unit.Weight.Ounces'
    | 'Alexa.Unit.Weight.Pounds'
    | 'Alexa.Value.Close'
    | 'Alexa.Value.Delicate'
    | 'Alexa.Value.High'
    | 'Alexa.Value.Low'
    | 'Alexa.Value.Maximum'
    | 'Alexa.Value.Medium'
    | 'Alexa.Value.Minimum'
    | 'Alexa.Value.Open'
    | 'Alexa.Value.QuickWash';

export type AlexaV3UnitOfMeasure =
    | 'Alexa.Unit.Angle.Degrees'
    | 'Alexa.Unit.Angle.Radians'
    | 'Alexa.Unit.Distance.Feet'
    | 'Alexa.Unit.Distance.Inches'
    | 'Alexa.Unit.Distance.Kilometers'
    | 'Alexa.Unit.Distance.Meters'
    | 'Alexa.Unit.Distance.Miles'
    | 'Alexa.Unit.Distance.Yards'
    | 'Alexa.Unit.Mass.Grams'
    | 'Alexa.Unit.Mass.Kilograms'
    | 'Alexa.Unit.Percent'
    | 'Alexa.Unit.Temperature.Celsius'
    | 'Alexa.Unit.Temperature.Degrees'
    | 'Alexa.Unit.Temperature.Fahrenheit'
    | 'Alexa.Unit.Temperature.Kelvin'
    | 'Alexa.Unit.Volume.CubicFeet'
    | 'Alexa.Unit.Volume.CubicMeters'
    | 'Alexa.Unit.Volume.Gallons'
    | 'Alexa.Unit.Volume.Liters'
    | 'Alexa.Unit.Volume.Pints'
    | 'Alexa.Unit.Volume.Quarts'
    | 'Alexa.Unit.Weight.Ounces'
    | 'Alexa.Unit.Weight.Pounds';

export type AlexaV3DirectiveType =
    | 'SetTargetTemperature'
    | 'SetColorTemperature'
    | 'IncreaseColorTemperature'
    | 'DecreaseColorTemperature'
    | 'ReportState'
    | 'SetThermostatMode'
    | 'AdjustTargetTemperature'
    | 'AdjustVolume'
    | 'SetVolume'
    | 'Lock'
    | 'Unlock'
    | 'TurnOn'
    | 'TurnOff'
    | 'SetColor'
    | 'SetMode'
    | 'SetMute'
    | 'AdjustMode'
    | 'ErrorResponse'
    | 'Response'
    | 'StateReport'
    | 'ChangeReport'
    | 'Discover.Response'
    | 'AcceptGrant.Response'
    | 'SetBrightness'
    | 'Activate'
    | 'ActivationStarted';

export type AlexaV3Namespace =
    | 'Alexa'
    | 'Alexa.BrightnessController'
    | 'Alexa.ColorController'
    | 'Alexa.ColorTemperatureController'
    | 'Alexa.ContactSensor'
    | 'Alexa.EndpointHealth'
    | 'Alexa.HumiditySensor'
    | 'Alexa.LockController'
    | 'Alexa.ModeController'
    | 'Alexa.MotionSensor'
    | 'Alexa.PercentageController'
    | 'Alexa.PowerController'
    | 'Alexa.RangeController'
    | 'Alexa.SceneController'
    | 'Alexa.Speaker'
    | 'Alexa.TemperatureSensor'
    | 'Alexa.ThermostatController';

// Basis Header
export interface AlexaV3Header {
    namespace: AlexaV3Namespace;
    name: AlexaV3DirectiveType;
    messageId: string;
    correlationToken?: string;
    payloadVersion: '3';
    // Name of the mode, for example, Washer.WashCycle or Washer.WashTemperature.
    instance?: string;
    physicalInteraction?: boolean;
    propertyName?: string;
}
// Scope (OAuth Token)
export interface AlexaV3BearerTokenScope {
    type: 'BearerToken';
    token: string;
}

// Endpoint
export interface AlexaV3EndpointRef {
    scope: AlexaV3BearerTokenScope;
    /** Name of the endpoint in ioBroker notation */
    endpointId: AlexaV3EndpointID;
    cookie?: Record<string, string>;
}

type AlexaV3Payload = {
    color?: {
        hue: number;
        saturation: number;
        brightness: number;
    };
    brightness?: number;
    brightnessDelta?: number; // there is no brightnessDeltaDefault
    colorTemperatureInKelvin?: number;
    mode?: string; // e.g. "WashCycle.Normal" or "Washer.WashTemperature"
    modeDelta?: number;
    mute?: boolean;
    volume?: number;
    volumeDefault?: boolean;
    percentage?: number;
    percentageDelta?: number; // there is no percentageDeltaDefault
    rangeValue?: number;
    rangeValueDelta?: number;
    rangeValueDeltaDefault?: boolean;
    targetSetpoint?: {
        value: number;
        scale: 'CELSIUS' | 'FAHRENHEIT';
    };
    holdUntil?: {
        start: string;
        end: string;
    };
    targetSetpointDelta?: {
        value: number;
        scale: 'CELSIUS' | 'FAHRENHEIT';
    };
    temperatureScale?: 'CELSIUS' | 'FAHRENHEIT';
    thermostatMode?: {
        value: AlexaV3ThermostatMode;
    };

    lowerSetpoint?: {
        value: number;
        scale: 'CELSIUS' | 'FAHRENHEIT';
    };
    upperSetpoint?: {
        value: number;
        scale: 'CELSIUS' | 'FAHRENHEIT';
    };
    change?: {
        cause: {
            type:
                | 'PHYSICAL_INTERACTION'
                | 'VOICE_INTERACTION'
                | 'APP_INTERACTION'
                | 'PERIODIC_POLL'
                | 'RULE_TRIGGER'
                | 'TIMER_EXPIRED'
                | 'ALARM_CLOCK'
                | 'HANGUP';
        };
        properties: any[];
    };
    timestamp?: string; // ISO 8601
    cause?: {
        type:
            | 'PHYSICAL_INTERACTION'
            | 'VOICE_INTERACTION'
            | 'APP_INTERACTION'
            | 'PERIODIC_POLL'
            | 'RULE_TRIGGER'
            | 'TIMER_EXPIRED'
            | 'ALARM_CLOCK'
            | 'HANGUP'; // forward-compat
    };
    endpoints?: AlexaV3DiscoverAppliance[];
};

export interface AlexaV3Directive<Payload = AlexaV3Payload> {
    header: AlexaV3Header;
    endpoint?: AlexaV3EndpointRef;
    payload: Payload;
}

// ReportState Request
export type AlexaV3ReportStateDirective = AlexaV3Directive<object> & {
    header: AlexaV3Header & { namespace: 'Alexa'; name: 'ReportState'; payloadVersion: '3' };
    endpoint: AlexaV3EndpointRef;
};

// Property im Context
export interface AlexaV3ContextProperty {
    namespace: AlexaV3Namespace;
    name: string;
    value: any;
    timeOfSample?: string; // ISO
    uncertaintyInMilliseconds?: number;
    instance?: string;
}
// StateReport Response
export interface AlexaV3StateReportResponse {
    event: {
        header: AlexaV3Header & { namespace: 'Alexa'; name: 'StateReport' };
        endpoint: AlexaV3EndpointRef;
        payload: Record<string, any>;
    };
    context?: {
        properties: AlexaV3ContextProperty[];
    };
}

// Error answer
export interface AlexaV3ErrorResponse {
    event: {
        header: AlexaV3Header & { namespace: 'Alexa'; name: string };
        endpoint?: AlexaV3EndpointRef;
        payload: {
            type: string;
            message: string;
        };
    };
}

export interface AlexaV3SmartHomeRequestEnvelope {
    directive: AlexaV3Directive;

    currentState?: {
        namespace: AlexaV3Namespace;
        instance?: string;
        name: string;
        value: any;
    }[];
}

type AlexaV3ModeConfiguration = {
    ordered: boolean;
    supportedModes: AlexaV3ThermostatMode[];
    supportsScheduling?: boolean;
};

type AlexaV3RangeConfiguration = {
    supportedRange: {
        minimumValue: number;
        maximumValue: number;
        precision: 1;
    };
    unitOfMeasure?: AlexaV3UnitOfMeasure;
    presets?: {
        rangeValue: number;
        presetResources: {
            friendlyNames: AlexaV3FriendlyName[];
        };
    }[];
};

// Discovery
export interface AlexaV3Capability {
    type?: 'AlexaInterface';
    interface: AlexaV3Namespace;
    version: string;
    instance?: string;
    properties?: {
        supported: { name: string }[];
        proactivelyReported?: boolean;
        retrievable?: boolean;
        nonControllable?: boolean;
    };
    configuration?:
        | AlexaV3ModeConfiguration
        | AlexaV3RangeConfiguration
        | {
              ordered: boolean;
              supportedModes: AlexaV3DiscoveryResponse[];
          };
    semantics?: {
        actionMappings: AlexaV3ActionMapping[];
        stateMappings: AlexaV3StateMapping[];
    };
    capabilityResources?: {
        friendlyNames: AlexaV3FriendlyName[];
    };
    supportsDeactivation?: boolean;
    cookie?: Record<string, string>;
    alexaResponse?: any;
}

export interface AlexaV3DiscoverAppliance {
    endpointId: string;
    manufacturerName?: string;
    description?: string;
    friendlyName: string;
    displayCategories: AlexaV3Category[];
    cookie?: Record<string, string>;
    additionalAttributes?: {
        manufacturer: string;
        model: string;
        serialNumber: string;
        firmwareVersion: string;
        softwareVersion: string;
        customIdentifier: string;
    };
    capabilities: AlexaV3Capability[];
    connections?: {
        type: 'MATTER' | 'TCP_IP';
        macAddress: '00:11:22:AA:BB:33:44:55';
        macNetworkInterface?: 'WIFI';
    }[];
}

export interface AlexaV3DiscoverResponse {
    event: {
        header: AlexaV3Header & { namespace: 'Alexa.Discovery'; name: 'Discover.Response' };
        payload: {
            endpoints: AlexaV3DiscoverAppliance[];
        };
    };
}

// alexa-change-report.d.ts
export interface AlexaV3ReportedState {
    namespace: AlexaV3Namespace;
    instance?: string;
    name: string;
    value: any;
    timeOfSample?: string;
    uncertaintyInMilliseconds?: number;
}

export type AlexaSH3ControlType =
    | 'AirCondition'
    | 'Blind'
    | 'Button'
    | 'ContactSensor'
    | 'Ct'
    | 'Dimmer'
    | 'Door'
    | 'Gate'
    | 'Humidity'
    | 'Hue'
    | 'Light'
    | 'Lock'
    | 'Motion'
    | 'Percentage'
    | 'Rgb'
    | 'RgbSingle'
    | 'RgbwSingle'
    | 'Slider'
    | 'Socket'
    | 'Temperature'
    | 'Thermostat'
    | 'VacuumCleaner'
    | 'Volume'
    | 'VolumeGroup'
    | 'Window'
    | 'Unknown';

export type AlexaSH3ControlDescription = {
    type: AlexaSH3ControlType;
    states: Record<string, IotExternalDetectorState | undefined>;
    supported: string[];
    enforced: string[];
    state: AlexaV3ReportedState[];
};
export type AlexaSH3DeviceDescription = {
    controls: AlexaSH3ControlDescription[];
    friendlyName: string;
    autoDetected: boolean;
    funcName?: string;
    roomName?: string;
    id: string;
    type: string;
    state: AlexaV3ReportedState[];
    possibleTypes: Types[];
    typeWasDetected: boolean;
};
export interface AlexaV3ChangeReportResponse {
    event: AlexaV3ChangeReportEvent;
    context?: {
        properties: AlexaV3ReportedState[];
    };
}

export interface AlexaV3ChangeReportEvent {
    header: AlexaV3ChangeReportHeader;
    endpoint: AlexaV3EndpointRef;
    payload: {
        change: AlexaV3Change;
    };
}

export interface AlexaV3ChangeReportHeader {
    namespace: 'Alexa';
    name: 'ChangeReport';
    messageId: string; // UUID v4 preferred
    payloadVersion: '3';
}

export interface AlexaV3Change {
    cause: {
        type:
            | 'PHYSICAL_INTERACTION'
            | 'VOICE_INTERACTION'
            | 'APP_INTERACTION'
            | 'PERIODIC_POLL'
            | 'RULE_TRIGGER'
            | 'TIMER_EXPIRED'
            | 'ALARM_CLOCK'
            | 'HANGUP'; // forward-compat
    };
    properties: {
        namespace: AlexaV3Namespace;
        name: string;
        value: any;
        timeOfSample: string;
        uncertaintyInMilliseconds: number;
    }[];
}

export type AlexaV3SmartHomeResponse = AlexaV3StateReportResponse | AlexaV3ErrorResponse | AlexaV3DiscoverResponse;

export type AlexaV3Request = AlexaV3SmartHomeRequestEnvelope;

export type AlexaV3ActionMapping = {
    '@type': 'ActionsToDirective';
    actions: string[];
    directive: {
        name: string;
        payload: {
            mode: string;
        };
    };
};
export type AlexaV3FriendlyName =
    | { '@type': 'asset'; value: { assetId: AlexaV3AssetName } }
    | { '@type': 'text'; value: { text: string; locale: string } };

export type AlexaV3DiscoveryResponse = {
    value: string;
    modeResources: {
        friendlyNames: AlexaV3FriendlyName[];
    };
};

export type AlexaV3StateMapping = {
    '@type': 'StatesToValue';
    states: string[];
    value: string;
};

export type SmartNameObject = { [lang in ioBroker.Languages]?: string } & {
    smartType?: Types | null;
    byON?: string | null; // it could be 'stored' or percent as string
    toggle?: boolean;
    noAutoDetect?: boolean;
};
export type SmartName = null | false | string | SmartNameObject;

export interface IotInternalDetectorState extends InternalDetectorState {
    id: string;
    smartName: SmartName | undefined;
    common: {
        min?: number;
        max?: number;
        unit?: string;
        type?: ioBroker.CommonType;
        states?: { [value: string]: string };
        role?: string;
        name?: ioBroker.StringOrTranslated;
        step?: number;
    };
    // Used by GUI
    subscribed?: boolean;
}

export interface IotExternalDetectorState extends Omit<IotInternalDetectorState, 'enums' | 'role'> {
    enums?: boolean;
    role?: string;
}

export interface IotExternalPatternControl {
    states: IotExternalDetectorState[];
    type: Types;
    enumRequired?: boolean;
    object?: {
        id: string;
        type: ioBroker.ObjectType;
        common: ioBroker.StateCommon | ioBroker.ChannelCommon | ioBroker.DeviceCommon;
        autoDetected: boolean; // If the object was taken from enum
        toggle?: boolean;
        smartName?: SmartName;
        possibleTypes: Types[];
        typeWasDetected: boolean; // If the smartType was detected by engine
    };
    groupNames: string[];
    room?: {
        id: string;
        common: ioBroker.EnumCommon;
    };
    functionality?: {
        id: string;
        common: ioBroker.EnumCommon;
    };
}
