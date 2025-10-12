"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSendToAdapter = handleSendToAdapter;
exports.handleGetInstances = handleGetInstances;
exports.handleGeofenceData = handleGeofenceData;
exports.handleDevicesData = handleDevicesData;
/**
 * Handles `sendToAdapter` command
 *
 * @param visuData the data sent by the app
 * @param adapter the adapter instance
 */
async function handleSendToAdapter(visuData, adapter) {
    const { instance, message, data } = visuData;
    const resp = await adapter.sendToAsync(instance, message, data, { timeout: 2_000 });
    return { ...resp };
}
/**
 * Handles `sendToAdapter` command
 *
 * @param visuData the data sent by the app
 * @param adapter the adapter instance
 */
async function handleGetInstances(visuData, adapter) {
    const { adapterName } = visuData;
    const res = await adapter.getObjectViewAsync('system', 'instance', {
        startkey: `system.adapter.${adapterName}.`,
        endkey: `system.adapter.${adapterName}.\u9999`,
    });
    const instances = res.rows.map(item => item.id.substring('system.adapter.'.length));
    return { instances };
}
/**
 *  Handle Geofence data update from app
 *
 * @param visuData the data sent by app
 * @param adapter the adapter instance
 */
async function handleGeofenceData(visuData, adapter) {
    await adapter.setObjectNotExistsAsync('app.geofence', {
        type: 'folder',
        common: {
            name: 'Geofence',
            desc: 'Collection of all the Geofence-locations managed by ioBroker Visu App',
        },
        native: {},
    });
    for (const [locationName, presenceStatus] of Object.entries(visuData.presence)) {
        const id = `app.geofence.${locationName.replace(adapter.FORBIDDEN_CHARS, '_').replace(/\s|ä|ü|ö/g, '_')}`;
        await adapter.setObjectNotExistsAsync(id, {
            type: 'state',
            common: {
                name: locationName,
                desc: `Geofence Status of ${locationName}`,
                type: 'boolean',
                read: true,
                write: false,
                role: 'indicator',
            },
            native: {},
        });
        await adapter.setState(id, presenceStatus, true);
    }
}
/** Map data name to state common */
const commonMapping = {
    actionResponse: {
        name: 'Action response for a notification',
        desc: 'User clicked on a notification and this is the response from the app',
        type: 'string',
        read: true,
        write: false,
        role: 'text',
    },
    ssid: {
        name: 'Current connected WiFi',
        desc: 'Current connected WiFi network',
        type: 'string',
        read: true,
        write: false,
        role: 'text',
    },
    connectionType: {
        name: 'Current connection type',
        desc: 'Current connection type',
        type: 'string',
        read: true,
        write: false,
        role: 'text',
    },
    batteryLevel: {
        name: 'Current battery level',
        desc: 'Current battery level',
        type: 'number',
        read: true,
        write: false,
        role: 'level.battery',
        unit: '%',
    },
    batteryState: {
        name: 'Current battery state',
        desc: 'Current battery state',
        type: 'number',
        read: true,
        write: false,
        role: 'value',
        states: {
            0: 'unknown',
            1: 'unplugged',
            2: 'charging',
            3: 'full',
        },
    },
};
/**
 *  Handle device's data update from app
 *
 * @param visuData the data sent by app
 * @param adapter the adapter instance
 */
async function handleDevicesData(visuData, adapter) {
    // e.g. {"devices":{"iPhone":{"batteryLevel":95,"batteryState":2,"ssid":"FRITZ!Box Fon WLAN","connectionType":"wifi"}}}
    for (const [deviceName, deviceData] of Object.entries(visuData.devices)) {
        const deviceId = `app.devices.${deviceName.replace(adapter.FORBIDDEN_CHARS, '_').replace(/\s|ä|ü|ö/g, '_')}`;
        await adapter.setObjectNotExistsAsync(deviceId, {
            type: 'folder',
            common: {
                name: deviceName,
                desc: 'All states related to this device',
            },
            native: {},
        });
        for (const [dataName, dataVal] of Object.entries(deviceData)) {
            const id = `${deviceId}.${dataName}`;
            if (!commonMapping[dataName]) {
                adapter.log.warn(`Unknown device data "${dataName}" with value "${dataVal}"`);
            }
            await adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: commonMapping[dataName],
                native: {},
            });
            await adapter.setState(id, dataVal, true);
        }
    }
}
//# sourceMappingURL=visuApp.js.map