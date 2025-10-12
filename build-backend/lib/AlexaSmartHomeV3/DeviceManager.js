"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Device_1 = __importDefault(require("./Device"));
const Utils = __importStar(require("./Helpers/Utils"));
const Directives_1 = __importDefault(require("./Alexa/Directives"));
const Controls_1 = __importDefault(require("./Controls"));
const Logger_1 = __importDefault(require("./Helpers/Logger"));
const AdapterProvider_1 = __importDefault(require("./Helpers/AdapterProvider"));
const AlexaResponse_1 = __importDefault(require("./Alexa/AlexaResponse"));
const IotProxy_1 = __importDefault(require("./Helpers/IotProxy"));
const RateLimiter_1 = __importDefault(require("./Helpers/RateLimiter"));
const OverallDailyRateLimitExceeded_1 = __importDefault(require("./Exceptions/OverallDailyRateLimitExceeded"));
const HourlyDeviceRateLimitExceeded_1 = __importDefault(require("./Exceptions/HourlyDeviceRateLimitExceeded"));
const ChangeReport_1 = __importDefault(require("./Alexa/Directives/ChangeReport"));
const Discovery_1 = __importDefault(require("./Alexa/Directives/Discovery"));
const ReportState_1 = __importDefault(require("./Alexa/Directives/ReportState"));
const node_crypto_1 = require("node:crypto");
class DeviceManager {
    lang = 'en';
    devices = [];
    subscribed = [];
    log;
    eventsPausedTill = 0; // timestamp
    collecting = false;
    recollect = false;
    /** Creates a Device Manager */
    constructor() {
        this.log = new Logger_1.default(this);
    }
    informAboutStatesChange() {
        void AdapterProvider_1.default.get().setState('smart.updates3', true, true);
    }
    get language() {
        return this.lang;
    }
    set language(value) {
        this.lang = value;
    }
    matchDirective(event) {
        if (ChangeReport_1.default.matches(event)) {
            return new ChangeReport_1.default();
        }
        if (Discovery_1.default.matches(event)) {
            return new Discovery_1.default();
        }
        if (ReportState_1.default.matches(event)) {
            return new ReportState_1.default();
        }
        return null;
    }
    get endpoints() {
        return this.devices;
    }
    endpointById(id) {
        return this.devices.find(device => device.id === id);
    }
    addDevice(device) {
        this.devices.push(device);
    }
    toDevice(detectedControls, friendlyName, autoDetected, roomName, funcName, toggle) {
        const controls = [];
        this.log.debug(`merging controls to a device with name ${friendlyName}`);
        detectedControls.forEach(item => {
            this.log.silly(`processing control: ${JSON.stringify(item)}`);
            const control = Controls_1.default.factory(item);
            if (control) {
                this.log.debug(`${item.type} added to ${friendlyName}`);
                controls.push(control);
            }
            else {
                this.log.debug(`control of type ${item.type} not supported yet. Skipped.`);
            }
        });
        if (controls.length === 0) {
            // the controls are not supported yet...
            return;
        }
        // create and add a new device to the collected devices
        this.addDevice(new Device_1.default({
            id: friendlyName,
            friendlyName,
            controls,
            autoDetected,
            roomName,
            funcName,
            toggle,
        }));
    }
    getName(name) {
        if (!name) {
            return '';
        }
        if (typeof name === 'object') {
            return name[this.lang] || name.en || '';
        }
        return name;
    }
    async collectEndpoints() {
        if (this.collecting) {
            this.log.debug(`collecting devices already in progress. Skipping...`);
            this.recollect = true;
            return;
        }
        this.collecting = true;
        this.log.debug(`(re)collecting devices...`);
        try {
            // const discoveryNeeded = this.devices.length > 0;
            this.devices = [];
            const defaultToggle = AdapterProvider_1.default.get().config.defaultToggle || false;
            // collect all iobroker controls in terms of iobroker type detector (https://github.com/ioBroker/ioBroker.type-detector)
            let detectedControls = await Utils.controls(AdapterProvider_1.default.get(), this.lang);
            this.log.debug(`type detector found ${detectedControls.length} controls`);
            // Normally, every control is a smart device. But due to the iobroker concept of 'rooms and functions'
            // multiple controls might be merged to a single device.
            // as long as not all controls mapped to a device...
            // detectedControls = detectedControls.filter(c => ['light', 'dimmer'].includes(c.type));
            const createdGroups = [];
            while (detectedControls.length) {
                // take the next control
                const control = detectedControls[0];
                let processedControls = [];
                if (control.room?.common?.name) {
                    if (control.functionality?.common?.name) {
                        // controls in the same room with the same functionality
                        processedControls = detectedControls.filter(item => control.room &&
                            item.room?.id === control.room.id &&
                            control.functionality &&
                            item.functionality?.id === control.functionality.id);
                        this.toDevice(processedControls, Utils.friendlyNameByRoomAndFunctionName(control, this.lang), true, this.getName(control.room?.common?.name), this.getName(control.functionality?.common?.name), processedControls[0].object?.toggle ?? defaultToggle);
                    }
                    else {
                        this.log.debug(`Control of type [${control.type}] assigned to room [${this.getName(control.room.common.name)}] has no function. Skipped.`);
                    }
                }
                else if (control.groupNames) {
                    // no room, but smart name (not only one)
                    control.groupNames.forEach(groupName => {
                        if (!createdGroups.includes(groupName)) {
                            createdGroups.push(groupName);
                            processedControls = detectedControls.filter(item => item.groupNames?.includes(groupName));
                            this.toDevice(processedControls, this.getName(groupName), false, undefined, undefined, processedControls[0].object?.toggle ?? defaultToggle);
                        }
                    });
                }
                else {
                    // neither room nor smart name
                    this.log.debug(`Control of type [${control.type}] has neither room no smart name. Skipped.`);
                }
                if (processedControls.length === 0) {
                    processedControls = [control];
                }
                // remove processed controls
                const objectIds = processedControls.map(item => item.object?.id);
                detectedControls = detectedControls.filter(item => item.object && !objectIds.includes(item.object.id));
            }
            // done
            this.log.debug(`finished collecting devices. there is/are ${this.devices.length} device(s) in total`);
            for (const device of this.devices) {
                this.log.debug(`${device.toString()}`);
            }
            // a new discovery process is needed in case we had already devices and device collection was
            // triggered again by, e.g., a change in room/function enums
            // if (discoveryNeeded) {
            //     this.log.info(`Please delete all managed by ioBroker devices in your Alexa app and then start discovery`);
            // }
            // collect all relevant states to subscribe to updates
            const stateIds = new Set(this.devices
                .flatMap(d => d.controls)
                .flatMap(item => item.supported)
                .flatMap(item => item.properties)
                .map(item => item.getId)
                .filter(id => id));
            this.log.debug(`registering for updates of total ${stateIds.size} states`);
            const promises = [];
            const newSubscribed = Array.from(stateIds);
            // subscribe to updates
            for (const id of newSubscribed) {
                this.log.silly(`subscribing to updates of ${id}`);
                if (!this.subscribed.includes(id)) {
                    this.subscribed.push(id);
                    promises.push(AdapterProvider_1.default.subscribe(id));
                }
            }
            this.subscribed.sort();
            // wait till all promises are settled
            const results = await Promise.allSettled(promises);
            // unsubscribe from unused states
            for (let i = this.subscribed.length - 1; i >= 0; i--) {
                const id = this.subscribed[i];
                if (!newSubscribed.includes(id)) {
                    this.log.silly(`unsubscribing from updates of ${id}`);
                    this.subscribed.splice(i, 1);
                    await AdapterProvider_1.default.unsubscribe(id);
                }
            }
            const failedReasons = results.filter(item => item.status !== 'fulfilled').flatMap(item => item.reason);
            if (failedReasons.length) {
                this.log.debug(`failed to subscribe for updates of ${failedReasons.length} states`);
                try {
                    for (const reason of failedReasons) {
                        this.log.silly(`failed subscribing: ${typeof reason === 'string' ? reason : JSON.stringify(reason)}`);
                    }
                }
                catch {
                    // nop
                }
            }
        }
        catch (e) {
            this.log.error(`failed to collect devices: ${e}`);
        }
        this.collecting = false;
        // if during the collection a new collection was triggered, start collecting again
        if (this.recollect) {
            this.recollect = false;
            setTimeout(() => this.collectEndpoints(), 1000);
        }
    }
    async destroy() {
        const promises = [];
        for (const id of this.subscribed) {
            this.log.silly(`unsubscribing from updates of ${id}`);
            promises.push(AdapterProvider_1.default.subscribe(id));
        }
        await Promise.allSettled(promises);
        this.subscribed = [];
    }
    publishStateChange(stateChange) {
        if (this.eventsPausedTill < Date.now()) {
            this.log.silly(`publishing ${JSON.stringify(stateChange)}`);
            IotProxy_1.default.publishStateChange(stateChange);
        }
    }
    pauseEvents() {
        this.eventsPausedTill = Date.now() + 30 * 60 * 1000; // 30 minutes
    }
    async executeWithinRateLimits(endpointId, awaitable, errorResponse) {
        try {
            await RateLimiter_1.default.incrementAndGet(endpointId);
            return await awaitable();
        }
        catch (error) {
            if (error instanceof OverallDailyRateLimitExceeded_1.default || error instanceof HourlyDeviceRateLimitExceeded_1.default) {
                this.log.warn(error.message);
            }
            else {
                this.log.error(error.message);
            }
            return errorResponse;
        }
    }
    async handleAlexaEvent(event) {
        this.log.debug(`incoming Alexa event`);
        this.log.silly(`${JSON.stringify(event)}`);
        if (!event?.directive?.header) {
            throw new Error('Alexa event header is missing');
        }
        let response;
        const directive = this.matchDirective(event);
        if (directive) {
            response = await directive.handle(event, this);
        }
        else {
            const endpointId = event?.directive?.endpoint?.endpointId;
            const device = endpointId ? this.endpointById(endpointId) : undefined;
            if (device) {
                if (device.supports(event)) {
                    response = await this.executeWithinRateLimits(endpointId, async () => {
                        response = await device.handle(event);
                        if (!AlexaResponse_1.default.isErrorResponse(response)) {
                            // report state change via voice interaction
                            const propertyName = response.context?.properties[0].name;
                            const responseEvent = ChangeReport_1.default.get(device.id, propertyName || '', false, event.directive.header.messageId);
                            const directive = this.matchDirective(responseEvent);
                            if (directive) {
                                // BF[2024.02.04]: temporarily disabled as produced a huge number of events
                                // const stateChange = await directive.handle(responseEvent, this);
                                // get device state (not just one control)
                                const deviceState = await device.reportState();
                                if (JSON.stringify(device.lastReportedState) !== JSON.stringify(deviceState)) {
                                    device.lastReportedState = deviceState;
                                    // fire state change report to Alexa
                                    // BF[2024.02.04]: temporarily disabled as produced a huge number of events
                                    // this.publishStateChange(stateChange);
                                    this.informAboutStatesChange();
                                }
                                else {
                                    this.log.debug(`ignoring state change event for ${endpointId} due to the same_ value [${JSON.stringify(deviceState)}]`);
                                }
                            }
                        }
                        return response;
                    }, AlexaResponse_1.default.endpointUnreachable(event.directive.header.messageId).get());
                }
                else {
                    response = AlexaResponse_1.default.directiveNotSupportedByDevice(device.friendlyName, event.directive.header.namespace, event.directive.header.messageId, event.directive.header.payloadVersion).get();
                }
            }
            else {
                response = AlexaResponse_1.default.endpointUnreachable(event.directive.header.messageId).get();
            }
        }
        this.log.silly(`response: ${JSON.stringify(response)}`);
        return response;
    }
    async handleStateUpdate(id, state) {
        // ignore updates not confirmed by a corresponding device
        if (!state?.ack) {
            this.log.silly(`ignoring state change event for ${id} due to state.ack == ${state?.ack}`);
            return;
        }
        let notFound = true;
        for (const device of this.devices) {
            const property = device.controls
                .flatMap(item => item.supported)
                .flatMap(item => item.properties)
                .find(item => item.getId === id);
            if (property) {
                notFound = false;
                if (property.currentValue === state.val) {
                    this.log.debug(`ignoring state change event for ${id} due to the same value [${state.val}]`);
                }
                else {
                    property.currentValue = state.val;
                    const responseEvent = Directives_1.default.ChangeReport.get(device.id, property.propertyName, true, (0, node_crypto_1.randomUUID)());
                    const directive = this.matchDirective(responseEvent);
                    if (directive) {
                        // BF[2024.02.04]: temporarily disabled as produced a huge number of events
                        // const stateChange = await directive.handle(event, this);
                        // get device state (not just one control)
                        const deviceState = await device.reportState();
                        if (JSON.stringify(device.lastReportedState) !== JSON.stringify(deviceState)) {
                            device.lastReportedState = deviceState;
                            this.informAboutStatesChange();
                            // fire state change report to Alexa
                            // BF[2024.02.04]: temporarily disabled as produced a huge number of events
                            // await this.executeWithinRateLimits(device.id, async () =>
                            //     this.publishStateChange(stateChange), undefined);
                        }
                        else {
                            this.log.debug(`ignoring state change event for ${id} due to the same_ value [${JSON.stringify(deviceState)}]`);
                        }
                    }
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
exports.default = DeviceManager;
//# sourceMappingURL=DeviceManager.js.map