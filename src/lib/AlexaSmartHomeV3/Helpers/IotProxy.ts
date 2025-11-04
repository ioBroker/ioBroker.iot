import type { device as DeviceModule } from 'aws-iot-device-sdk';
import type AlexaResponse from '../Alexa/AlexaResponse';

export default class IotProxy {
    static device: DeviceModule;
    static stateChangedTopic: string;
    static login: string;

    static init(device: DeviceModule, clientId: string, login: string): void {
        IotProxy.device = device;
        IotProxy.stateChangedTopic = `response/${clientId}/changeReport`;
        this.login = login;
    }

    static publishStateChange(stateChange: AlexaResponse): void {
        // replace INVALID token with the client id
        if (stateChange.event?.endpoint) {
            stateChange.event.endpoint.scope.token = this.login;
        }
        return IotProxy.publish(IotProxy.stateChangedTopic, stateChange);
    }

    static publish(topic: string, message: AlexaResponse | string): void {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }
        setTimeout(
            strMessage => {
                IotProxy.device?.publish(topic, strMessage, { qos: 0 }, (_error?: Error): void => {});
            },
            100,
            message,
        );
    }
}
