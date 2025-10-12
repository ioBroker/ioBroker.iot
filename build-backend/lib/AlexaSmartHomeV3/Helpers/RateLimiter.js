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
// import path from 'path';
const HourlyDeviceRateLimitExceeded_1 = __importDefault(require("../Exceptions/HourlyDeviceRateLimitExceeded"));
const OverallDailyRateLimitExceeded_1 = __importDefault(require("../Exceptions/OverallDailyRateLimitExceeded"));
// import FileHelper from './FileHelper';
const Utils = __importStar(require("./Utils"));
class RateLimiter {
    static MAX_DEVICE_STATE_CHANGES_PER_HOUR = 60;
    static MAX_CHANGES_PER_DAY = 1000;
    static USAGE_STORAGE_FOLDER = 'usage';
    static USAGE_STORAGE_FILE_NAME = 'usage.json';
    static usage = new Map();
    static init() {
        try {
            // await FileHelper.createFolder(FileHelper.absolutePath(this.USAGE_STORAGE_FOLDER));
            // const raw = await FileHelper.read(this.storageFileName);
            // this.usage = new Map(JSON.parse(raw));
            this.usage = new Map();
        }
        catch {
            this.usage = new Map();
        }
        return Promise.resolve();
    }
    // static get storageFileName(): string {
    //     return FileHelper.absolutePath(path.join(this.USAGE_STORAGE_FOLDER, this.USAGE_STORAGE_FILE_NAME));
    // }
    static async store() {
        // try {
        //     await FileHelper.write(this.storageFileName, JSON.stringify(Array.from(this.usage.entries())));
        // } catch (error) {
        //     // nop
        // }
    }
    static get(endpointId) {
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
    static async incrementAndGet(endpointId) {
        const item = this.get(endpointId);
        if (!Utils.isCurrentHour(Utils.parseISOString(item.timestamp))) {
            item.changeCounter = 1;
            item.timestamp = Utils.currentHour().toISOString();
        }
        else {
            item.changeCounter += 1;
        }
        this.usage.set(endpointId, item);
        try {
            await this.store();
        }
        catch {
            // nop
        }
        if (item.changeCounter > this.MAX_DEVICE_STATE_CHANGES_PER_HOUR) {
            throw new HourlyDeviceRateLimitExceeded_1.default(`Hourly state change limit for ${endpointId} exceeded`);
        }
        const changesToday = Array.from(this.usage.values())
            .filter(item => Utils.isToday(Utils.parseISOString(item.timestamp)))
            .reduce((sum, { changeCounter }) => sum + changeCounter, 0);
        if (changesToday > this.MAX_CHANGES_PER_DAY) {
            throw new OverallDailyRateLimitExceeded_1.default(`Overall daily state change limit exceeded`);
        }
        return item;
    }
}
exports.default = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map