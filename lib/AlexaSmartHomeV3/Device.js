const Utils = require('./Helpers/Utils')
const { v4: uuidv4 } = require('uuid');
const Logger = require('./Helpers/Logger');

/**
 * This class hides the different iobroker controls representing physical devices from Alexa
 * and makes them appear as a single endpoint.
 * Due to differences in Alexa's and iobroker's endpoint/devices concepts, we have to merge some of the
 * by the type-detector detected controls to a single device, so that multiple controls are considered
 * to be the same endpoint from Alexa's perspective.
 * This leads to a situation where while Alexa believes controlling a single endpoint by sending a directive
 * to change the endpoint's state, in reality, the states of multiple controls, i.e. physical devices, are changed.
 *
 * @class
 */
class Device {
    constructor(opts) {
        this.id = Utils.defaultIfNullOrEmpty(Utils.endpointId(opts.id), uuidv4());
        this.friendlyName = Utils.defaultIfNullOrEmpty(opts.friendlyName, uuidv4());
        this.controls = Utils.defaultIfNullOrEmpty(opts.controls, []);
        this.log = new Logger(this);
    }

    supports(event) {
        return this.controls.find(c => c.supports(event)) !== undefined;
    }

    async handle(event) {
        this.log.debug(`handling alexa event`);
        this.log.silly(`${JSON.stringify(event)}`);

        const promises = []
        this.controls.forEach(control => promises.push(control.handle(event)));
        const results = await Promise.allSettled(promises);

        const fulfilled = results.find(item => item.status === 'fulfilled');
        // @ts-ignore
        return fulfilled !== undefined ? fulfilled.value : results[0].reason;
    }

    async reportState() {
        const promises = [];
        this.controls.forEach(control => promises.push(control.reportState()));
        const results = await Promise.allSettled(promises);
        // @ts-ignore
        const properties = results.filter(item => item.status === 'fulfilled').flatMap(item => item.value);
        return Utils.distinctByPropertyName(properties, 'name');
    }

    get capabilities() {
        const allCapabilities = this.controls.flatMap(item => item.supported).map(item => item.capability);
        return Utils.distinctByPropertyName(allCapabilities, 'namespace');
    }

    get displayCategories() {
        return Array.from(new Set(this.controls.flatMap(item => item.categories)));
    }

    toString() {
        const controls = this.controls;
        const controlsAsString = function () {
            let repr = '';
            for (const ctrl of controls) {
                repr += `${ctrl.toString()}\n`;
            }
            return repr;
        }
        return '\n'
            + `${this.friendlyName}`
            + '\n'
            + `\u2514`.padEnd(2, `\u2500`) + 'Controls'
            + '\n'
            + ''.padStart(2) + `\u2514`.padEnd(2, `\u2500`) + controlsAsString();
    }
}

module.exports = Device;