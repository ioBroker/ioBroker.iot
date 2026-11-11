import { deflateSync } from 'node:zlib';

// AWS IoT MQTT message size limit (128 KB minus overhead)
export const MAX_IOT_MESSAGE_LENGTH = 127 * 1024;

/**
 * Packs a message the same way as it is sent to the cloud if it is bigger than MAX_IOT_MESSAGE_LENGTH.
 */
export function packMessage(payload: string): string {
    return deflateSync(payload).toString('base64');
}

/**
 * Size in bytes of the packed message as it is sent to the cloud.
 */
export function getPackedSize(payload: string): number {
    return packMessage(payload).length;
}

/**
 * Size in bytes of the message as it is sent to the cloud: unpacked if it fits, otherwise packed.
 */
export function getSentSize(payload: string): number {
    const bytes = Buffer.byteLength(payload);
    return bytes > MAX_IOT_MESSAGE_LENGTH ? getPackedSize(payload) : bytes;
}
