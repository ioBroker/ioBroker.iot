class Adapter {
    static adapterInstance;
    static init(adapter) {
        Adapter.adapterInstance = adapter;
    }
    static get() {
        return Adapter.adapterInstance;
    }
}

module.exports = Adapter;