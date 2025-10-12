import type { IotAdapter } from '../../../main';

export default class AdapterProvider {
    static adapterInstance: IotAdapter;

    static init(adapter: IotAdapter): void {
        AdapterProvider.adapterInstance = adapter;
    }

    static get(): IotAdapter {
        return AdapterProvider.adapterInstance;
    }

    /**
     * Sets iobroker state to the passed on value
     *
     * @param id - id of the state to write the value to
     * @param value - value to set the provided state to
     */
    static async setState(id: string, value: ioBroker.StateValue): Promise<void> {
        await AdapterProvider.get().setForeignStateAsync(id, value, false);
        AdapterProvider.get().log.silly(`[AlexaV3::AdapterProvider]: set [${id}] to [${value}]`);
    }

    /**
     * @param id State id to get the value from
     * @returns Object's val returned by the iobroker getForeignStateAsync function
     */
    static async getState(id: string): Promise<ioBroker.StateValue | undefined> {
        const state = await AdapterProvider.get().getForeignStateAsync(id);
        if (state === null) {
            return null;
        }
        return state ? (state.val === undefined ? null : state.val) : undefined;
    }

    static async subscribe(id: string): Promise<void> {
        await AdapterProvider.get().subscribeForeignStatesAsync(id);
    }

    static async unsubscribe(id: string): Promise<void> {
        await AdapterProvider.get().unsubscribeForeignStatesAsync(id);
    }
}
