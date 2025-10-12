"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const adapter_core_1 = __importDefault(require("@iobroker/adapter-core"));
const AdapterProvider_1 = __importDefault(require("./AdapterProvider"));
class FileHelper {
    static _rootFolder;
    static get rootFolder() {
        this._rootFolder ||= adapter_core_1.default.getAbsoluteInstanceDataDir(AdapterProvider_1.default.get());
        return this._rootFolder;
    }
    static async createFolder(folderPath) {
        return new Promise((resolve, reject) => {
            node_fs_1.default.access(folderPath, error => {
                if (error) {
                    // If the directory does not exist, then create it
                    node_fs_1.default.mkdir(folderPath, { recursive: true }, error => {
                        if (error) {
                            reject(error);
                        }
                        else {
                            resolve();
                        }
                    });
                }
                else {
                    resolve();
                }
            });
        });
    }
    static absolutePath(relativePath) {
        return node_path_1.default.join(this.rootFolder, relativePath);
    }
    static exists(fileName) {
        return node_fs_1.default.existsSync(fileName);
    }
    static async read(fileName) {
        return node_fs_1.default.promises.readFile(fileName, 'utf-8');
    }
    static async write(fileName, content) {
        if (typeof content !== 'string') {
            content = JSON.stringify(content);
        }
        return node_fs_1.default.promises.writeFile(fileName, content);
    }
}
exports.default = FileHelper;
//# sourceMappingURL=FileHelper.js.map