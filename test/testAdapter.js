/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
const expect = require('chai').expect;
const setup = require('@iobroker/legacy-testing');

let objects = null;
let states = null;
let onStateChanged = null;
let onObjectChanged = null;
let sendToID = 1;

const adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.') + 1);

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    console.log(`Try check #${counter}`);
    if (counter > 30) {
        return cb && cb('Cannot check connection');
    }

    states.getState(`system.adapter.${adapterShortName}.0.alive`, (err, state) => {
        err && console.error(err);
        if (state && state.val) {
            cb && cb();
        } else {
            setTimeout(() =>
                checkConnectionOfAdapter(cb, counter + 1), 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        return cb && cb(`Cannot check value Of State ${id}`);
    }

    states.getState(id, (err, state) => {
        err && console.error(err);
        if (value === null && !state) {
            cb && cb();
        } else if (state && (value === undefined || state.val === value)) {
            cb && cb();
        } else {
            setTimeout(() =>
                checkValueOfState(id, value, cb, counter + 1), 500);
        }
    });
}

function sendTo(target, command, message, callback) {
    onStateChanged = (id, state) => {
        if (id === 'messagebox.system.adapter.test.0') {
            callback(state.message);
        }
    };

    states.pushMessage(`system.adapter.${target}`, {
        command,
        message,
        from: 'system.adapter.test.0',
        callback: {
            message,
            id: sendToID++,
            ack: false,
            time: Date.now()
        }
    });
}

describe(`Test ${adapterShortName} adapter`, function () {
    before(`Test ${adapterShortName} adapter: Start js-controller`, function (_done) {
        this.timeout(600000); // because of first install from npm

        setup.setupController(async () => {
            const config = await setup.getAdapterConfig();
            // enable adapter
            config.common.enabled = true;
            config.common.loglevel = 'debug';

            config.native.apikey = 'test';

            await setup.setAdapterConfig(config.common, config.native);

            setup.installAdapter('web', () => {
                setup.startController(true,
                    (id, obj) => {
                    },
                    (id, state) => onStateChanged && onStateChanged(id, state),
                    (_objects, _states) => {
                        objects = _objects;
                        states = _states;
                        _done();
                    });
            });
        });
    });

    /*
        ENABLE THIS WHEN ADAPTER RUNS IN DEAMON MODE TO CHECK THAT IT HAS STARTED SUCCESSFULLY
    */
    it(`Test ${adapterShortName} adapter: Check if adapter started`, function (done) {
        this.timeout(60000);
        checkConnectionOfAdapter(res => {
            res && console.log(res);
            expect(res).not.to.be.equal('Cannot check connection');
            objects.setObject('system.adapter.test.0', {
                    common: {},
                    type: 'instance'
                },
                () => {
                    states.subscribeMessage('system.adapter.test.0');
                    done();
                });
        });
    });
    /**/

    /*
        PUT YOUR OWN TESTS HERE USING
        it('Testname', function ( done) {
            ...
        });

        You can also use "sendTo" method to send messages to the started adapter
    */

    after(`Test ${adapterShortName} adapter: Stop js-controller`, function (done) {
        this.timeout(10000);

        setup.stopController(normalTerminated => {
            console.log(`Adapter normal terminated: ${normalTerminated}`);
            done();
        });
    });
});
