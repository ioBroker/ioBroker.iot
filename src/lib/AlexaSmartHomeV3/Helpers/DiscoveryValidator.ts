import Logger from './Logger';

// Alexa limits: https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-discovery.html
const MAX_ENDPOINTS = 300;
const MAX_ENDPOINT_ID_LENGTH = 256;
const MAX_FRIENDLY_NAME_LENGTH = 128;
const MAX_DESCRIPTION_LENGTH = 128;
const MAX_MANUFACTURER_NAME_LENGTH = 128;
const MAX_CAPABILITIES_PER_ENDPOINT = 100;

// https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-discovery.html#display-categories
const VALID_DISPLAY_CATEGORIES = new Set([
    'ACTIVITY_TRIGGER', 'AIR_CONDITIONER', 'AIR_FRESHENER', 'AIR_PURIFIER', 'AIR_QUALITY_MONITOR',
    'ALEXA_VOICE_ENABLED', 'AUTO_ACCESSORY', 'BLUETOOTH_SPEAKER', 'CAMERA', 'CHRISTMAS_TREE',
    'COFFEE_MAKER', 'COMPUTER', 'CONTACT_SENSOR', 'DISHWASHER', 'DOOR', 'DOORBELL', 'DRYER',
    'EXTERIOR_BLIND', 'FAN', 'GAME_CONSOLE', 'GARAGE_DOOR', 'HEADPHONES', 'HUB',
    'INTERIOR_BLIND', 'LAPTOP', 'LIGHT', 'MICROWAVE', 'MOBILE_PHONE', 'MOTION_SENSOR',
    'MUSIC_SYSTEM', 'NETWORK_HARDWARE', 'OTHER', 'OVEN', 'PHONE', 'PRINTER', 'REMOTE',
    'ROUTER', 'SCENE_TRIGGER', 'SCREEN', 'SECURITY_PANEL', 'SECURITY_SYSTEM', 'SLOW_COOKER',
    'SMARTLOCK', 'SMARTPLUG', 'SPEAKER', 'STREAMING_DEVICE', 'SWITCH', 'TABLET',
    'TEMPERATURE_SENSOR', 'THERMOSTAT', 'TV', 'VACUUM_CLEANER', 'VACUUM', 'VEHICLE',
    'WASHER', 'WATER_HEATER', 'WEARABLE',
]);

const VALID_NAMESPACES = new Set([
    'Alexa', 'Alexa.BrightnessController', 'Alexa.ColorController', 'Alexa.ColorTemperatureController',
    'Alexa.ContactSensor', 'Alexa.EndpointHealth', 'Alexa.HumiditySensor', 'Alexa.LockController',
    'Alexa.ModeController', 'Alexa.MotionSensor', 'Alexa.PercentageController', 'Alexa.PowerController',
    'Alexa.RangeController', 'Alexa.SceneController', 'Alexa.Speaker', 'Alexa.TemperatureSensor',
    'Alexa.ThermostatController',
]);

interface DiscoveryEndpoint {
    endpointId: string;
    friendlyName: string;
    description?: string;
    manufacturerName?: string;
    displayCategories?: string[];
    capabilities?: DiscoveryCapability[];
}

interface DiscoveryCapability {
    type?: string;
    interface?: string;
    version?: string;
    properties?: {
        supported?: { name: string }[];
    };
}

export interface ValidationError {
    endpointId: string;
    friendlyName: string;
    field: string;
    message: string;
}

/**
 * Validates the Alexa Discovery response and removes invalid endpoints.
 * Returns the sanitized response.
 */
export function validateDiscoveryResponse(response: any, log: Logger): any {
    const endpoints: DiscoveryEndpoint[] = response?.event?.payload?.endpoints;
    if (!endpoints || !Array.isArray(endpoints)) {
        return response;
    }

    const errors: ValidationError[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    // Validate and filter endpoints in place (backwards to safely splice)
    for (let i = endpoints.length - 1; i >= 0; i--) {
        const ep = endpoints[i];
        const epErrors = validateEndpoint(ep, seenIds, seenNames);
        if (epErrors.length) {
            errors.push(...epErrors);
            endpoints.splice(i, 1);
        }
    }

    // Enforce 300 endpoint limit
    if (endpoints.length > MAX_ENDPOINTS) {
        log.warn(`Discovery response has ${endpoints.length} endpoints, truncating to ${MAX_ENDPOINTS}`);
        endpoints.length = MAX_ENDPOINTS;
    }

    // Log all validation errors
    for (const err of errors) {
        log.warn(`Discovery: removed "${err.friendlyName}" (${err.endpointId}): ${err.field} — ${err.message}`);
    }

    if (errors.length) {
        log.info(`Discovery: ${errors.length} invalid endpoint(s) removed, ${endpoints.length} remaining`);
    }

    return response;
}

function validateEndpoint(
    ep: DiscoveryEndpoint,
    seenIds: Set<string>,
    seenNames: Set<string>,
): ValidationError[] {
    const errors: ValidationError[] = [];
    const id = ep.endpointId || '(empty)';
    const name = ep.friendlyName || '(empty)';

    // endpointId
    if (!ep.endpointId) {
        errors.push({ endpointId: id, friendlyName: name, field: 'endpointId', message: 'missing' });
    } else if (ep.endpointId.length > MAX_ENDPOINT_ID_LENGTH) {
        errors.push({ endpointId: id, friendlyName: name, field: 'endpointId', message: `exceeds ${MAX_ENDPOINT_ID_LENGTH} chars` });
    } else if (!/^[\w#;:!@"$%&'()*+,\-./>=<?[\\\]^`{|}~ ]+$/.test(ep.endpointId)) {
        errors.push({ endpointId: id, friendlyName: name, field: 'endpointId', message: 'contains invalid characters' });
    } else if (seenIds.has(ep.endpointId)) {
        errors.push({ endpointId: id, friendlyName: name, field: 'endpointId', message: 'duplicate' });
    }
    seenIds.add(ep.endpointId);

    // friendlyName: required, 1-128 chars, no special characters beyond letters/numbers/spaces
    if (!ep.friendlyName) {
        errors.push({ endpointId: id, friendlyName: name, field: 'friendlyName', message: 'missing' });
    } else if (ep.friendlyName.length > MAX_FRIENDLY_NAME_LENGTH) {
        errors.push({ endpointId: id, friendlyName: name, field: 'friendlyName', message: `exceeds ${MAX_FRIENDLY_NAME_LENGTH} chars` });
    } else if (seenNames.has(ep.friendlyName.toLowerCase())) {
        errors.push({ endpointId: id, friendlyName: name, field: 'friendlyName', message: 'duplicate name (Alexa may confuse devices)' });
    }
    seenNames.add(ep.friendlyName.toLowerCase());

    // description
    if (ep.description && ep.description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push({ endpointId: id, friendlyName: name, field: 'description', message: `exceeds ${MAX_DESCRIPTION_LENGTH} chars` });
    }

    // manufacturerName
    if (ep.manufacturerName && ep.manufacturerName.length > MAX_MANUFACTURER_NAME_LENGTH) {
        errors.push({ endpointId: id, friendlyName: name, field: 'manufacturerName', message: `exceeds ${MAX_MANUFACTURER_NAME_LENGTH} chars` });
    }

    // displayCategories: at least one required
    if (!ep.displayCategories || !ep.displayCategories.length) {
        errors.push({ endpointId: id, friendlyName: name, field: 'displayCategories', message: 'missing or empty' });
    } else {
        for (const cat of ep.displayCategories) {
            if (!VALID_DISPLAY_CATEGORIES.has(cat)) {
                errors.push({ endpointId: id, friendlyName: name, field: 'displayCategories', message: `unknown category "${cat}"` });
            }
        }
    }

    // capabilities: at least Alexa interface required
    if (!ep.capabilities || !ep.capabilities.length) {
        errors.push({ endpointId: id, friendlyName: name, field: 'capabilities', message: 'missing or empty' });
    } else {
        if (ep.capabilities.length > MAX_CAPABILITIES_PER_ENDPOINT) {
            errors.push({ endpointId: id, friendlyName: name, field: 'capabilities', message: `exceeds ${MAX_CAPABILITIES_PER_ENDPOINT} capabilities` });
        }

        const hasAlexa = ep.capabilities.some(c => c.interface === 'Alexa');
        if (!hasAlexa) {
            errors.push({ endpointId: id, friendlyName: name, field: 'capabilities', message: 'missing required Alexa interface' });
        }

        for (const cap of ep.capabilities) {
            if (cap.interface && !VALID_NAMESPACES.has(cap.interface)) {
                errors.push({ endpointId: id, friendlyName: name, field: 'capabilities', message: `unknown interface "${cap.interface}"` });
            }
            if (cap.version && cap.version !== '3') {
                errors.push({ endpointId: id, friendlyName: name, field: 'capabilities', message: `unexpected version "${cap.version}" for ${cap.interface}` });
            }
        }
    }

    return errors;
}
