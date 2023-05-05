const fs = require('fs');
const path = require('path');
const utils = require('@iobroker/adapter-core')

class FileHelper {
    static rootFolder;
    static init(adapter) {
        FileHelper.rootFolder = utils.getAbsoluteInstanceDataDir(adapter);
    }

    static absolutePath(relativePath) {
        return path.join(FileHelper.rootFolder, relativePath)
    }

    static exists(fileName) {
        return fs.existsSync(fileName);
    }

    static async read(fileName) {
        return fs.promises.readFile(fileName, 'utf-8');
    }

    static async write(fileName, content) {
        if (typeof content !== "string") {
            content = JSON.stringify(content)
        }
        return fs.promises.writeFile(fileName, content);
    }
}

module.exports = FileHelper;
