import type IotAdapter from '../main';
/**
 * Handles `sendToAdapter` command
 *
 * @param visuData the data sent by the app
 * @param adapter the adapter instance
 */
export async function handleSendToAdapter(
    visuData: { command: 'sendToAdapter'; instance: string; message: string; data: any },
    adapter: IotAdapter,
): Promise<{ error?: string; result?: string }> {
    const { instance, message, data } = visuData;

    const resp = await adapter.sendToAsync(instance, message, data, { timeout: 2_000 });
    return { ...resp } as { error?: string; result?: string };
}

/**
 * Handles `sendToAdapter` command
 *
 * @param visuData the data sent by the app
 * @param adapter the adapter instance
 */
export async function handleGetInstances(
    visuData: { command: 'getInstances'; adapterName: string },
    adapter: IotAdapter,
): Promise<{ instances: string[] }> {
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
export async function handleGeofenceData(
    visuData: { presence: Record<string, boolean>; devices?: Record<string, any> },
    adapter: IotAdapter,
): Promise<void> {
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
const commonMapping: Record<string, ioBroker.StateCommon> = {
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
    latitude: {
        name: 'Current latitude',
        desc: 'Current GPS latitude of the device',
        type: 'number',
        read: true,
        write: false,
        role: 'value.gps.latitude',
        unit: '°',
    },
    longitude: {
        name: 'Current longitude',
        desc: 'Current GPS longitude of the device',
        type: 'number',
        read: true,
        write: false,
        role: 'value.gps.longitude',
        unit: '°',
    },
};

/** IDs of device states, which were already checked/created in this adapter run */
const checkedStates = new Set<string>();

/**
 * Get common for device data. For unknown data, the common is derived from the value
 *
 * @param dataName name of the data sent by app
 * @param dataVal value of the data
 */
function getDeviceDataCommon(dataName: string, dataVal: ioBroker.StateValue): ioBroker.StateCommon {
    if (commonMapping[dataName]) {
        return commonMapping[dataName];
    }
    const valType = typeof dataVal;
    return {
        name: dataName,
        type: valType === 'number' || valType === 'boolean' || valType === 'string' ? valType : 'mixed',
        read: true,
        write: false,
        role: 'state',
    };
}

/**
 *  Handle device's data update from app
 *
 * @param visuData the data sent by app
 * @param adapter the adapter instance
 */
export async function handleDevicesData(
    visuData: {
        presence?: Record<string, boolean>;
        devices: { [deviceId: string]: { [dataName: string]: ioBroker.StateValue } };
    },
    adapter: IotAdapter,
): Promise<void> {
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

            if (!checkedStates.has(id)) {
                if (!commonMapping[dataName]) {
                    adapter.log.warn(`Unknown device data "${dataName}" with value "${dataVal}"`);
                }

                const obj = await adapter.getObjectAsync(id);
                // Create the object or repair it, if it was created earlier without common
                if (!obj?.common?.type) {
                    await adapter.setObject(id, {
                        type: 'state',
                        common: getDeviceDataCommon(dataName, dataVal),
                        native: obj?.native || {},
                    });
                }
                checkedStates.add(id);
            }

            await adapter.setState(id, dataVal, true);
        }
    }
}
