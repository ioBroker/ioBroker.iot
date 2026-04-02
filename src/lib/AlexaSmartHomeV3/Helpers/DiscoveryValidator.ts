import type Logger from './Logger';

// Alexa limits: https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-discovery.html
const MAX_ENDPOINTS = 300;
const MAX_ENDPOINT_ID_LENGTH = 256;
const MAX_FRIENDLY_NAME_LENGTH = 128;
const MAX_DESCRIPTION_LENGTH = 128;
const MAX_MANUFACTURER_NAME_LENGTH = 128;
const MAX_CAPABILITIES_PER_ENDPOINT = 100;

// AWS IoT MQTT message size limit (128 KB minus overhead)
const MAX_RESPONSE_SIZE_BYTES = 127 * 1024;
const RESPONSE_SIZE_WARNING_BYTES = 100 * 1024;

// https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-discovery.html#display-categories
const VALID_DISPLAY_CATEGORIES = new Set([
    'ACTIVITY_TRIGGER',
    'AIR_CONDITIONER',
    'AIR_FRESHENER',
    'AIR_PURIFIER',
    'AIR_QUALITY_MONITOR',
    'ALEXA_VOICE_ENABLED',
    'AUTO_ACCESSORY',
    'BLUETOOTH_SPEAKER',
    'CAMERA',
    'CHRISTMAS_TREE',
    'COFFEE_MAKER',
    'COMPUTER',
    'CONTACT_SENSOR',
    'DISHWASHER',
    'DOOR',
    'DOORBELL',
    'DRYER',
    'EXTERIOR_BLIND',
    'FAN',
    'GAME_CONSOLE',
    'GARAGE_DOOR',
    'HEADPHONES',
    'HUB',
    'INTERIOR_BLIND',
    'LAPTOP',
    'LIGHT',
    'MICROWAVE',
    'MOBILE_PHONE',
    'MOTION_SENSOR',
    'MUSIC_SYSTEM',
    'NETWORK_HARDWARE',
    'OTHER',
    'OVEN',
    'PHONE',
    'PRINTER',
    'REMOTE',
    'ROUTER',
    'SCENE_TRIGGER',
    'SCREEN',
    'SECURITY_PANEL',
    'SECURITY_SYSTEM',
    'SLOW_COOKER',
    'SMARTLOCK',
    'SMARTPLUG',
    'SPEAKER',
    'STREAMING_DEVICE',
    'SWITCH',
    'TABLET',
    'TEMPERATURE_SENSOR',
    'THERMOSTAT',
    'TV',
    'VACUUM_CLEANER',
    'VACUUM',
    'VEHICLE',
    'WASHER',
    'WATER_HEATER',
    'WEARABLE',
]);

const VALID_NAMESPACES = new Set([
    'Alexa',
    'Alexa.BrightnessController',
    'Alexa.ColorController',
    'Alexa.ColorTemperatureController',
    'Alexa.ContactSensor',
    'Alexa.EndpointHealth',
    'Alexa.HumiditySensor',
    'Alexa.LockController',
    'Alexa.ModeController',
    'Alexa.MotionSensor',
    'Alexa.PercentageController',
    'Alexa.PowerController',
    'Alexa.RangeController',
    'Alexa.SceneController',
    'Alexa.Speaker',
    'Alexa.TemperatureSensor',
    'Alexa.ThermostatController',
]);

// Multi-instance capabilities that require an instance property
const REQUIRES_INSTANCE = new Set(['Alexa.ModeController', 'Alexa.RangeController', 'Alexa.ToggleController']);

// Alexa wake words — devices named like this can't be controlled
const WAKE_WORDS = ['alexa', 'echo', 'amazon', 'computer', 'ziggy'];

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
    instance?: string;
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
    severity: 'error' | 'warning';
}

/**
 * Validates the Alexa Discovery response and removes invalid endpoints.
 * Returns the sanitized response.
 */
export function validateDiscoveryResponse(response: any, log: Logger): any {
    // Validate response header structure
    const header = response?.event?.header;
    if (!header) {
        log.error('Discovery: response has no event.header');
        return response;
    }
    if (header.namespace !== 'Alexa.Discovery') {
        log.error(`Discovery: unexpected namespace "${header.namespace}", expected "Alexa.Discovery"`);
    }
    if (header.name !== 'Discover.Response') {
        log.error(`Discovery: unexpected name "${header.name}", expected "Discover.Response"`);
    }
    if (header.payloadVersion !== '3') {
        log.error(`Discovery: unexpected payloadVersion "${header.payloadVersion}", expected "3"`);
    }

    const endpoints: DiscoveryEndpoint[] = response?.event?.payload?.endpoints;
    if (!endpoints || !Array.isArray(endpoints)) {
        return response;
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    // Validate and filter endpoints in place (backwards to safely splice)
    for (let i = endpoints.length - 1; i >= 0; i--) {
        const ep = endpoints[i];
        const epIssues = validateEndpoint(ep, seenIds, seenNames);
        const epErrors = epIssues.filter(e => e.severity === 'error');
        const epWarnings = epIssues.filter(e => e.severity === 'warning');
        warnings.push(...epWarnings);
        if (epErrors.length) {
            errors.push(...epErrors);
            endpoints.splice(i, 1);
        }
    }

    // Enforce 300 endpoint limit
    if (endpoints.length > MAX_ENDPOINTS) {
        log.warn(`Discovery: ${endpoints.length} endpoints exceeds Alexa limit of ${MAX_ENDPOINTS}, truncating`);
        endpoints.length = MAX_ENDPOINTS;
    }

    // Check total response size against AWS IoT MQTT limit
    const responseSize = JSON.stringify(response).length;
    if (responseSize > MAX_RESPONSE_SIZE_BYTES) {
        const originalCount = endpoints.length;
        while (endpoints.length > 1 && JSON.stringify(response).length > MAX_RESPONSE_SIZE_BYTES) {
            const removed = endpoints.pop()!;
            log.warn(`Discovery: removed "${removed.friendlyName}" to fit AWS IoT message size limit`);
        }
        log.warn(
            `Discovery: response was ${Math.round(responseSize / 1024)} KB (limit: ${Math.round(MAX_RESPONSE_SIZE_BYTES / 1024)} KB), reduced from ${originalCount} to ${endpoints.length} endpoints`,
        );
    } else if (responseSize > RESPONSE_SIZE_WARNING_BYTES) {
        log.warn(
            `Discovery: response is ${Math.round(responseSize / 1024)} KB with ${endpoints.length} endpoints — approaching AWS IoT limit of ${Math.round(MAX_RESPONSE_SIZE_BYTES / 1024)} KB`,
        );
    }

    // Log warnings (non-fatal)
    for (const w of warnings) {
        log.warn(`Discovery: "${w.friendlyName}" (${w.endpointId}): ${w.field} — ${w.message}`);
    }

    // Log errors (endpoint was removed)
    for (const err of errors) {
        log.warn(`Discovery: removed "${err.friendlyName}" (${err.endpointId}): ${err.field} — ${err.message}`);
    }

    if (errors.length || warnings.length) {
        log.info(
            `Discovery: ${endpoints.length} endpoint(s) valid, ${errors.length} removed, ${warnings.length} warning(s)`,
        );
    }

    return response;
}

function validateEndpoint(ep: DiscoveryEndpoint, seenIds: Set<string>, seenNames: Set<string>): ValidationError[] {
    const issues: ValidationError[] = [];
    const id = ep.endpointId || '(empty)';
    const name = ep.friendlyName || '(empty)';

    const error = (field: string, message: string): ValidationError => ({
        endpointId: id,
        friendlyName: name,
        field,
        message,
        severity: 'error',
    });
    const warning = (field: string, message: string): ValidationError => ({
        endpointId: id,
        friendlyName: name,
        field,
        message,
        severity: 'warning',
    });

    // --- endpointId ---
    if (!ep.endpointId) {
        issues.push(error('endpointId', 'missing'));
    } else if (ep.endpointId.length > MAX_ENDPOINT_ID_LENGTH) {
        issues.push(error('endpointId', `exceeds ${MAX_ENDPOINT_ID_LENGTH} chars`));
    } else if (!/^[\w#;:!@"$%&'()*+,\-./>=<?[\\\]^`{|}~ ]+$/.test(ep.endpointId)) {
        issues.push(error('endpointId', 'contains invalid characters'));
    } else if (seenIds.has(ep.endpointId)) {
        issues.push(error('endpointId', 'duplicate'));
    }
    seenIds.add(ep.endpointId);

    // --- friendlyName ---
    if (!ep.friendlyName || !ep.friendlyName.trim()) {
        issues.push(error('friendlyName', 'missing or empty'));
    } else if (ep.friendlyName.length > MAX_FRIENDLY_NAME_LENGTH) {
        issues.push(error('friendlyName', `exceeds ${MAX_FRIENDLY_NAME_LENGTH} chars`));
    } else {
        // Alexa rejects names that are only digits
        if (/^\d+$/.test(ep.friendlyName.trim())) {
            issues.push(error('friendlyName', 'must not be only digits'));
        }

        // Wake words as device name make the device unusable
        const lower = ep.friendlyName.toLowerCase().trim();
        if (WAKE_WORDS.includes(lower)) {
            issues.push(
                warning('friendlyName', `"${ep.friendlyName}" is an Alexa wake word — device may not be controllable`),
            );
        }

        // Duplicate names confuse Alexa ("which one did you mean?")
        if (seenNames.has(lower)) {
            issues.push(warning('friendlyName', 'duplicate name — Alexa will ask "which one did you mean?"'));
        }
        seenNames.add(lower);
    }

    // --- description ---
    if (ep.description && ep.description.length > MAX_DESCRIPTION_LENGTH) {
        issues.push(warning('description', `exceeds ${MAX_DESCRIPTION_LENGTH} chars, will be truncated`));
    }

    // --- manufacturerName ---
    if (ep.manufacturerName && ep.manufacturerName.length > MAX_MANUFACTURER_NAME_LENGTH) {
        issues.push(warning('manufacturerName', `exceeds ${MAX_MANUFACTURER_NAME_LENGTH} chars`));
    }

    // --- displayCategories ---
    if (!ep.displayCategories || !ep.displayCategories.length) {
        issues.push(error('displayCategories', 'missing or empty'));
    } else {
        for (const cat of ep.displayCategories) {
            if (!VALID_DISPLAY_CATEGORIES.has(cat)) {
                issues.push(error('displayCategories', `unknown category "${cat}"`));
            }
        }
    }

    // --- capabilities ---
    if (!ep.capabilities || !ep.capabilities.length) {
        issues.push(error('capabilities', 'missing or empty'));
    } else {
        if (ep.capabilities.length > MAX_CAPABILITIES_PER_ENDPOINT) {
            issues.push(error('capabilities', `exceeds ${MAX_CAPABILITIES_PER_ENDPOINT} capabilities`));
        }

        // Alexa interface is required on every endpoint
        const hasAlexa = ep.capabilities.some(c => c.interface === 'Alexa');
        if (!hasAlexa) {
            issues.push(error('capabilities', 'missing required Alexa interface'));
        }

        // Check for duplicate capabilities (same interface+instance)
        const capKeys = new Set<string>();
        for (const cap of ep.capabilities) {
            const capKey = `${cap.interface || ''}::${cap.instance || ''}`;
            if (cap.interface !== 'Alexa' && capKeys.has(capKey)) {
                issues.push(
                    error(
                        'capabilities',
                        `duplicate capability ${cap.interface}${cap.instance ? ` (${cap.instance})` : ''}`,
                    ),
                );
            }
            capKeys.add(capKey);

            // Validate individual capability
            if (cap.interface && !VALID_NAMESPACES.has(cap.interface)) {
                issues.push(warning('capabilities', `unknown interface "${cap.interface}"`));
            }

            if (cap.version && cap.version !== '3') {
                issues.push(error('capabilities', `unexpected version "${cap.version}" for ${cap.interface}`));
            }

            // ModeController and RangeController require instance
            if (cap.interface && REQUIRES_INSTANCE.has(cap.interface) && !cap.instance) {
                issues.push(error('capabilities', `${cap.interface} requires an instance property`));
            }

            // properties.supported must not be empty if defined
            if (cap.properties && Array.isArray(cap.properties.supported) && cap.properties.supported.length === 0) {
                issues.push(warning('capabilities', `${cap.interface} has empty properties.supported array`));
            }
        }
    }

    return issues;
}
