const Device = require('./Device');
const Utils = require('./Helpers/Utils');
const Directives = require('./Alexa/Directives');
const Controls = require('./Controls')
const Logger = require('./Helpers/Logger');
const AdapterProvider = require('./Helpers/AdapterProvider');
const AlexaResponse = require('./Alexa/AlexaResponse');
const IotProxy = require('./Helpers/IotProxy');
const RateLimiter = require('./Helpers/RateLimiter');
const OverallDailyRateLimitExceeded = require('./Exceptions/OverallDailyRateLimitExceeded');
const HourlyDeviceRateLimitExceeded = require('./Exceptions/HourlyDeviceRateLimitExceeded');

/**
 * @class
 * */
class DeviceManager {
    /**
     * Creates a Device Manager.
     * @constructor
     */
    constructor() {
        this.lang = 'en';
        this.devices = [];
        this.log = new Logger(this);
        this.eventsPausedTill = 0; // timestamp
    }

    get language() {
        return this.lang;
    }

    set language(value) {
        this.lang = value;
    }

    matchDirective(event) {
        let name = Object.keys(Directives).find(key =>
            Directives[key].matches(event));

        return name ? new Directives[name] : null;
    }

    get endpoints() {
        return this.devices
    }

    endpointById(id) {
        return this.devices.find(device => device.id === id);
    }

    addDevice(device) {
        this.devices.push(device);
    }

    toDevice(detectedControls, friendlyName) {
        let controls = []

        this.log.debug(`merging controls to a device with name ${friendlyName}`);

        detectedControls.forEach(item => {
            this.log.silly(`processing control: ${JSON.stringify(item)}`);
            const controlName = Object.keys(Controls).find(key => Controls[key].type === item.type);
            if (controlName) {
                controls.push(new Controls[controlName](item));
                this.log.debug(`${controlName} added to ${friendlyName}`);
            } else {
                this.log.debug(`control of type ${item.type} not supported yet. Skipped.`);
            }
        });

        if (controls.length === 0) {
            // the controls are not supported yet...
            return;
        }

        // create and add a new device to the collected devices
        this.addDevice(new Device({
            id: friendlyName,
            friendlyName: friendlyName,
            controls: controls,
        }));
    }

    async collectEndpoints() {
        this.log.debug(`(re)collecting devices...`);
        const discoveryNeeded = this.devices.length > 0;

        this.devices = [];

        // collect all iobroker controls in terms of iobroker type detector (https://github.com/ioBroker/ioBroker.type-detector)
        let detectedControls = await Utils.controls(AdapterProvider.get());

        this.log.debug(`type detector found ${detectedControls.length} controls`);

        // Normally, every control is a smart device. But due to the iobroker concept of 'rooms and functions'
        // multiple controls might be merged to a single device.

        // as long as not all controls mapped to a device...

        // detectedControls = detectedControls.filter(c => ['light', 'dimmer'].includes(c.type));

        while (detectedControls.length) {
            // take the next control
            let control = detectedControls[0];
            let processedControls = [];

            if (control.room?.common?.name) {
                if (control.functionality?.common?.name) {
                    // controls in the same room with the same functionality
                    processedControls = detectedControls.filter(item => item.room?.id === control.room.id && item.functionality?.id === control.functionality.id);
                    this.toDevice(processedControls, Utils.friendlyNameByRoomAndFunctionName(control, this.lang));
                } else {
                    this.log.debug(`Control of type [${control.type}] assigned to room [${control.room.common.name.en}] has no function. Skipped.`);
                }
            } else if (Utils.isValidSmartName(control.object.common?.smartName, this.lang)) { // no room, but smart name
                this.toDevice([control], Utils.stringify(control.object.common?.smartName, this.lang));
            } else { // neither room nor smart name
                this.log.debug(`Control of type [${control.type}] has neither room no smart name. Skipped.`);
            }

            if (processedControls.length === 0) {
                processedControls = [control];
            }

            // remove processed controls
            let objectIds = processedControls.map(item => item.object.id);
            detectedControls = detectedControls.filter(item => !objectIds.includes(item.object.id));
        }

        // done
        this.log.debug(`finished collecting devices. there is/are ${this.devices.length} device(s) in total`);
        for (const device of this.devices) {
            this.log.debug(`${device.toString()}`);
        }

        // a new discovery process is needed in case we had already devices and device collection was
        // triggered again by, e.g., a change in room/function enums
        if (discoveryNeeded) {
            this.log.warn(`Please delete all managed by ioBroker devices in your Alexa app and then start discovery`);
        }

        // collect all relevant states to subscribe to updates
        const stateIds = this.devices.flatMap(d => d.controls).flatMap(item => item.supported).flatMap(item => item.properties).map(item => item.getId);
        this.log.debug(`registering for updates of total ${stateIds.length} states`);
        const promises = [];
        // subscribe to updates
        for (const id of stateIds) {
            this.log.silly(`subscribing to updates of ${id}`)
            promises.push(AdapterProvider.subscribe(id));
        }
        // wait till all promises are settled
        const results = await Promise.allSettled(promises);
        // @ts-ignore
        const failedReasons = results.filter(item => item.status !== 'fulfilled').flatMap(item => item.reason);
        if (failedReasons.length) {
            this.log.debug(`failed to subscribe for updates of ${failedReasons.length} states`);
            try {
                for (const reason of failedReasons) {
                    this.log.silly(`failed subscribing: ${typeof reason === 'string' ? reason : JSON.stringify(reason)}`);
                }
            } catch {
                // nop
            }
        }
    }

    publishStateChange(stateChange) {
        if (this.eventsPausedTill < Date.now()) {
            this.log.silly(`publishing ${JSON.stringify(stateChange)}`);
            IotProxy.publishStateChange(stateChange);
        }
    }

    pauseEvents() {
        this.eventsPausedTill = Date.now() + 30 * 60 * 1000; // 30 minutes
    }

    /**
     * @param {string} endpointId
     * @param {{ (): Promise<any>; }} awaitable
     * @param {AlexaResponse} errorResponse
     */
    async executeWithinRateLimits(endpointId, awaitable, errorResponse) {
        try {
            RateLimiter.incrementAndGet(endpointId);
            return await awaitable();
        } catch (error) {
            if (error instanceof OverallDailyRateLimitExceeded || error instanceof HourlyDeviceRateLimitExceeded) {
                this.log.warn(error.message);
            } else {
                this.log.error(error.message);
            }

            return errorResponse;
        }
    }

    async handleAlexaEvent(event) {
        this.log.debug(`incoming Alexa event`);
        this.log.silly(`${JSON.stringify(event)}`);
        let response;
        let directive = this.matchDirective(event);
        if (directive) {
            response = await directive.handle(event, this);
        } else {
            const endpointId = event?.directive?.endpoint?.endpointId;
            let device = this.endpointById(endpointId);

            if (device) {
                if (device.supports(event)) {

                    response = await this.executeWithinRateLimits(endpointId, async () => {
                        response = await device.handle(event);
                        if (!AlexaResponse.isErrorResponse(response)) {
                            // report state change via voice interaction
                            const propertyName = response.context.properties[0].name;
                            const event = Directives.ChangeReport.get(device.id, propertyName, false);
                            const directive = this.matchDirective(event);
                            if (directive) {
                                const stateChange = await directive.handle(event, this);
                                this.publishStateChange(stateChange);
                            }
                        }
                        return response;
                    }, AlexaResponse.endpointUnreachable().get());

                } else {
                    response = AlexaResponse.directiveNotSupportedByDevice(device.friendlyName, event?.directive?.header?.namespace, event?.directive?.header?.payloadVersion).get();
                }
            } else {
                response = AlexaResponse.endpointUnreachable().get();
            }
        }

        this.log.silly(`response: ${JSON.stringify(response)}`);
        return response;
    }

    async handleStateUpdate(id, state) {
        // ignore updates not confirmed by a corresponding device
        if (!state.ack) {
            this.log.silly(`ignoring state change event for ${id} due to state.ack == ${state.ack}`)
            return;
        }

        let notFound = true;

        for (const device of this.devices) {
            const property = device.controls.flatMap(item => item.supported).flatMap(item => item.properties).find(item => item.getId === id);

            if (property) {
                notFound = false;
                if (property.currentValue === state.val) {
                    this.log.debug(`ignoring state change event for ${id} due to the same value [${state.val}]`);
                } else {
                    property.currentValue = state.val;

                    // fire state change report to Alexa
                    await this.executeWithinRateLimits(device.id, async () => {
                        const event = Directives.ChangeReport.get(device.id, property.propertyName, true);
                        const directive = this.matchDirective(event);
                        if (directive) {
                            const stateChange = await directive.handle(event, this);
                            this.publishStateChange(stateChange);
                        }
                    }, undefined);
                }

                // should be the only device having the id => stop processing here
                break;
            }
        }

        // this should never happen
        if (notFound) {
            this.log.debug(`state id ${id} doesn't belong to any device`);
        }
    }
}

module.exports = DeviceManager;