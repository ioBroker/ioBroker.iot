// import path from 'path';
import HourlyDeviceRateLimitExceeded from '../Exceptions/HourlyDeviceRateLimitExceeded';
import OverallDailyRateLimitExceeded from '../Exceptions/OverallDailyRateLimitExceeded';
// import FileHelper from './FileHelper';
import * as Utils from './Utils';
import type { AlexaV3EndpointID } from '../types';

export default class RateLimiter {
    static MAX_DEVICE_STATE_CHANGES_PER_HOUR = 60;
    static MAX_CHANGES_PER_DAY = 1000;
    static USAGE_STORAGE_FOLDER = 'usage';
    static USAGE_STORAGE_FILE_NAME = 'usage.json';

    static usage: Map<
        string,
        {
            changeCounter: number;
            timestamp: string;
        }
    > = new Map();

    static init(): Promise<void> {
        try {
            // await FileHelper.createFolder(FileHelper.absolutePath(this.USAGE_STORAGE_FOLDER));
            // const raw = await FileHelper.read(this.storageFileName);
            // this.usage = new Map(JSON.parse(raw));
            this.usage = new Map();
        } catch {
            this.usage = new Map();
        }
        return Promise.resolve();
    }

    // static get storageFileName(): string {
    //     return FileHelper.absolutePath(path.join(this.USAGE_STORAGE_FOLDER, this.USAGE_STORAGE_FILE_NAME));
    // }

    static async store(): Promise<void> {
        // try {
        //     await FileHelper.write(this.storageFileName, JSON.stringify(Array.from(this.usage.entries())));
        // } catch (error) {
        //     // nop
        // }
    }

    static get(endpointId: AlexaV3EndpointID): {
        changeCounter: number;
        timestamp: string;
    } {
        let item = this.usage.get(endpointId);
        if (!item) {
            item = {
                changeCounter: 0,
                timestamp: Utils.currentHour().toISOString(),
            };
            this.usage.set(endpointId, item);
        }
        return item;
    }

    static async incrementAndGet(endpointId: AlexaV3EndpointID): Promise<{
        changeCounter: number;
        timestamp: string;
    }> {
        const item = this.get(endpointId);

        if (!Utils.isCurrentHour(Utils.parseISOString(item.timestamp))) {
            item.changeCounter = 1;
            item.timestamp = Utils.currentHour().toISOString();
        } else {
            item.changeCounter += 1;
        }

        this.usage.set(endpointId, item);

        try {
            await this.store();
        } catch {
            // nop
        }

        if (item.changeCounter > this.MAX_DEVICE_STATE_CHANGES_PER_HOUR) {
            throw new HourlyDeviceRateLimitExceeded(`Hourly state change limit for ${endpointId} exceeded`);
        }

        const changesToday = Array.from(this.usage.values())
            .filter(item => Utils.isToday(Utils.parseISOString(item.timestamp)))
            .reduce((sum, { changeCounter }) => sum + changeCounter, 0);

        if (changesToday > this.MAX_CHANGES_PER_DAY) {
            throw new OverallDailyRateLimitExceeded(`Overall daily state change limit exceeded`);
        }

        return item;
    }
}
