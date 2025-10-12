"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class IotProxy {
    static device;
    static stateChangedTopic;
    static login;
    static init(device, clientId, login) {
        IotProxy.device = device;
        IotProxy.stateChangedTopic = `response/${clientId}/changeReport`;
        this.login = login;
    }
    static publishStateChange(stateChange) {
        // replace INVALID token with the client id
        if (stateChange.event?.endpoint) {
            stateChange.event.endpoint.scope.token = this.login;
        }
        return IotProxy.publish(IotProxy.stateChangedTopic, stateChange);
    }
    static publish(topic, message) {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }
        setTimeout(() => IotProxy.device?.publish(topic, message, { qos: 0 }, (_error) => { }), 100);
    }
}
exports.default = IotProxy;
//# sourceMappingURL=IotProxy.js.map