const engineHelper = require('@iobroker/legacy-testing/engineHelper');
const guiHelper = require('@iobroker/legacy-testing/guiHelper');
const adapterName = require('../package.json').name.replace('iobroker.', '');
let gPage;
const rootDir = `${__dirname}/../`;

describe('test-admin-gui', () => {
    before(async function (){
        this.timeout(240_000);

        // install js-controller, web and vis-2-beta
        await engineHelper.startIoBrokerAdapters({ adapters: ['admin', 'iot'] });
        const { page } = await guiHelper.startBrowser(`${adapterName}/index_m.html`, rootDir, process.env.CI === 'true');
        gPage = page;
    });

    it('Check admin server', async function (){
        this.timeout(15_000);
        return new Promise(resolve => setTimeout(async () => {
            await gPage.waitForSelector('.App', { timeout: 15_000 });
            await guiHelper.screenshot(rootDir, null, '01_started');
            resolve();
        }, 1000));
    });

    it('Select categories', async function (){
        this.timeout(5_000);
        await gPage.waitForSelector('.enums-tab', { timeout: 15_000 });
        // ignore message
        try {
            await gPage.click('.skill-linking-ok');
        } catch {
            // ignore
        }

        await gPage.click('.enums-tab');
        return new Promise(resolve => setTimeout(async () => {
            await guiHelper.screenshot(rootDir, null, '02_enums');
            resolve();
        }, 3000));
    });

    after(async function () {
        this.timeout(5000);
        await guiHelper.stopBrowser();
        console.log('BROWSER stopped');
        await engineHelper.stopIoBrokerAdapters();
        console.log('ioBroker stopped');
    });
});
