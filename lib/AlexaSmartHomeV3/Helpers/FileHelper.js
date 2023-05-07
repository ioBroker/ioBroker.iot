const fs = require('fs');
const path = require('path');
const utils = require('@iobroker/adapter-core');
const AdapterProvider = require('./AdapterProvider');

class FileHelper {
    /**
     * @type {string}
     */
    static _rootFolder;
    static get rootFolder() {
        if (!this._rootFolder) {
            this._rootFolder = utils.getAbsoluteInstanceDataDir(AdapterProvider.get());
        }
        return this._rootFolder;
    }

    static async createFolder(folderPath) {
        return new Promise((resolve, reject) => {
            fs.access(folderPath, (error) => {
                if (error) {
                    // If the directory does not exist, then create it
                    fs.mkdir(folderPath, { recursive: true }, (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(0);
                        }
                    });
                } else {
                    resolve(0)
                }
            });
        })
    }

    /**
     * @param {string} relativePath
     */
    static absolutePath(relativePath) {
        return path.join(this.rootFolder, relativePath)
    }

    /**
     * @param {fs.PathLike} fileName
     */
    static exists(fileName) {
        return fs.existsSync(fileName);
    }

    /**
     * @param {string} fileName
     */
    static async read(fileName) {
        return fs.promises.readFile(fileName, 'utf-8');
    }

    /**
     * @param {string} fileName
     * @param {string | Object} content
     */
    static async write(fileName, content) {
        if (typeof content !== "string") {
            content = JSON.stringify(content)
        }
        return fs.promises.writeFile(fileName, content);
    }
}

module.exports = FileHelper;
