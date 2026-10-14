import fs from 'node:fs';
import { device as DeviceModule, type DeviceOptions } from 'aws-iot-device-sdk';

type ExistsSync = (path: fs.PathLike | undefined | null) => boolean;

/**
 * Creates the AWS IoT device.
 *
 * aws-iot-device-sdk (common/lib/tls-reader.js) always calls `fs.existsSync(options.keyPath)`, `certPath` and
 * `caPath`, even if the certificates are given as Buffers. Node.js 24 warns about `fs.existsSync(undefined)`
 * (DEP0187). The certificates of this adapter are stored in states, not in files, so during the synchronous
 * constructor `existsSync` answers `undefined`/`null` itself with `false` - exactly what Node.js returns today.
 *
 * @param options options of the device
 */
export function createIotDevice(options: DeviceOptions): DeviceModule {
    const writableFs = fs as unknown as { existsSync: ExistsSync };
    const originalExistsSync = writableFs.existsSync;
    writableFs.existsSync = path => (path === undefined || path === null ? false : originalExistsSync(path));
    try {
        return new DeviceModule(options);
    } finally {
        writableFs.existsSync = originalExistsSync;
    }
}
