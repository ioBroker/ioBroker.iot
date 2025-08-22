export default class AdapterProvider {
    static adapterInstance: ioBroker.Adapter;

    static init(adapter: ioBroker.Adapter): void {
        AdapterProvider.adapterInstance = adapter;
    }

    static get(): ioBroker.Adapter {
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
        return state?.val;
    }

    static async subscribe(id: string): Promise<void> {
        await AdapterProvider.get().subscribeForeignStatesAsync(id);
    }

    static async unsubscribe(id: string): Promise<void> {
        await AdapterProvider.get().unsubscribeForeignStatesAsync(id);
    }
}
