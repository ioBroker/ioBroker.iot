import fs from 'node:fs';
import path from 'node:path';
import { getAbsoluteInstanceDataDir } from '@iobroker/adapter-core';
import AdapterProvider from './AdapterProvider';

export default class FileHelper {
    static _rootFolder: string;
    static get rootFolder(): string {
        this._rootFolder ||= getAbsoluteInstanceDataDir(AdapterProvider.get());
        return this._rootFolder;
    }

    static async createFolder(folderPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.access(folderPath, error => {
                if (error) {
                    // If the directory does not exist, then create it
                    fs.mkdir(folderPath, { recursive: true }, error => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    static absolutePath(relativePath: string): string {
        return path.join(this.rootFolder, relativePath);
    }

    static exists(fileName: string): boolean {
        return fs.existsSync(fileName);
    }

    static async read(fileName: string): Promise<string> {
        return fs.promises.readFile(fileName, 'utf-8');
    }

    static async write(fileName: string, content: any): Promise<void> {
        if (typeof content !== 'string') {
            content = JSON.stringify(content);
        }
        return fs.promises.writeFile(fileName, content);
    }
}
