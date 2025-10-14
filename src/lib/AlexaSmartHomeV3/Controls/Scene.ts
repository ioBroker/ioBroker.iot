import type { AlexaV3Category, AlexaV3Request, IotExternalPatternControl } from '../types';
import SceneController from '../Alexa/Capabilities/SceneController';
import Control from './Control';
import AlexaResponse from '../Alexa/AlexaResponse';
import AdapterProvider from '../Helpers/AdapterProvider';

export default class Scene extends Control {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        const sceneController = new SceneController();
        this._supported = [sceneController];
    }

    get categories(): AlexaV3Category[] {
        return ['SCENE_TRIGGER'];
    }

    /**
     * Scenes use button type from type-detector
     */
    static get type(): string {
        return 'button';
    }

    /**
     * Override handle to support SceneController.Activate directive
     */
    async handle(event: AlexaV3Request): Promise<AlexaResponse> {
        this.log.debug(`handling Alexa scene activation event`);
        this.log.silly(`${JSON.stringify(event)}`);

        // Check if this is an Activate directive for SceneController
        if (
            event?.directive?.header?.namespace === 'Alexa.SceneController' &&
            event?.directive?.header?.name === 'Activate'
        ) {
            try {
                // Get the SET state (button state)
                const setState = this.states[this.statesMap.set];
                if (!setState?.id) {
                    throw new Error('No SET state found for scene');
                }

                // Trigger the scene by setting the button state to true
                await AdapterProvider.setState(setState.id, true);

                // Return ActivationStarted response
                const response = new AlexaResponse({
                    namespace: 'Alexa.SceneController',
                    name: 'ActivationStarted',
                    messageId: event.directive.header.messageId,
                    correlationToken: event.directive.header.correlationToken,
                    payloadVersion: '3',
                    token: event.directive.endpoint?.scope?.token,
                    endpointId: event.directive.endpoint?.endpointId,
                });

                this.log.debug('Scene activated successfully');
                this.log.silly(`${JSON.stringify(response.get())}`);
                return response.get();
            } catch (error) {
                this.log.debug(`${error}`);
                this.log.error('Failed to activate scene');

                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                return Promise.reject(AlexaResponse.endpointUnreachable(event.directive.header.messageId).get());
            }
        }

        // If not an Activate directive, fall back to parent handler
        return super.handle(event);
    }
}

