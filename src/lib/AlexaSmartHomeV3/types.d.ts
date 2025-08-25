// we extend this type for our use
import type { InternalDetectorState, Types } from '@iobroker/type-detector/types';

export type AlexaV3EndpointID = string;

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

export type AlexaV3Category =
    | 'AIR_CONDITIONER'
    | 'CONTACT_SENSOR'
    | 'GARAGE_DOOR'
    | 'INTERIOR_BLIND'
    | 'LIGHT'
    | 'MOTION_SENSOR'
    | 'OTHER'
    | 'SMARTLOCK'
    | 'SMARTPLUG'
    | 'SPEAKER'
    | 'TEMPERATURE_SENSOR'
    | 'THERMOSTAT'
    | 'VACUUM_CLEANER';

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
    | 'SetBrightness';

export type AlexaV3Namespace =
    | 'Alexa'
    | 'Alexa.TemperatureSensor'
    | 'Alexa.ThermostatController'
    | 'Alexa.ColorTemperatureController'
    | 'Alexa.PowerController'
    | 'Alexa.MotionSensor'
    | 'Alexa.LockController'
    | 'Alexa.Speaker'
    | 'Alexa.EndpointHealth'
    | 'Alexa.ContactSensor';

// Basis Header
export interface AlexaV3Header {
    namespace: AlexaV3Namespace;
    name: AlexaV3DirectiveType;
    messageId: string;
    correlationToken?: string;
    payloadVersion: '3';
    // Name of the mode, for example Washer.WashCycle or Washer.WashTemperature.
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
    colorTemperatureInKelvin?: number;
    mode?: string; // e.g. "WashCycle.Normal" or "Washer.WashTemperature"
    modeDelta?: number;
    mute?: boolean;
    volume?: number;
    volumeDefault?: boolean;
    percentageDelta?: number;
    percentage?: number;
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
        value: 'COOL' | 'HEAT' | 'AUTO' | 'OFF' | 'ECO' | 'EM_HEAT';
    };

    lowerSetpoint?: {
        value: number;
        scale: 'CELSIUS' | 'FAHRENHEIT';
    };
    upperSetpoint?: {
        value: number;
        scale: 'CELSIUS' | 'FAHRENHEIT';
    };
    brightnessDelta?: number;
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
        properties: ContextProperty[];
    };
}

// Fehlerantwort
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
    configuration?: {
        ordered: boolean;
        supportedModes: (AlexaV3DiscoveryResponse | string)[];
        supportsScheduling?: boolean;
    };
    semantics?: {
        actionMappings: AlexaV3ActionMapping[];
        stateMappings: AlexaV3StateMapping[];
    };
    capabilityResources?: {
        friendlyNames: AlexaV3FriendlyName[];
    };
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
export type AlexaSH3ControlDescription = {
    type: string;
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
    | { '@type': 'asset'; value: { assetId: string } }
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
    smartType?: string | null;
    byON?: string | null;
    toggle?: boolean;
};
export type SmartName = null | false | string | SmartNameObject;

export interface IotInternalDetectorState extends InternalDetectorState {
    id: string;
    smartName: SmartName | undefined;
    common: {
        min?: number;
        max?: number;
        type?: ioBroker.CommonType;
        states?: { [value: string]: string };
        role?: string;
        name?: ioBroker.StringOrTranslated;
    };
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
        autoDetected: boolean;
        toggle?: boolean;
        smartName?: SmartName;
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
