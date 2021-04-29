const readdirp = require("readdirp");
const axios = require("axios");
const fs = require("fs");
const crypto = require("crypto");

class Plugin {
    constructor(path, name) {
        this.path = path;
        this.name = name;
        this.sourceURL = null;
        this.zipFile = null;
        this.failedFiles = [];
    }

    async init() {
        await this.isOfficial();
        await this.getVersion();
    }

    async getVersion() {
        if (this.version) return this.version;

        let standardFilePath = this.path + "/" + this.name + ".php";
        let EntryFileData = null;

        if (!fs.existsSync(standardFilePath)) {
            let readdirSettings = {
                entryType: "files",
                depth: 0,
            };

            let identifiers = ["Version", "License", "Text Domain"];

            for await (const file of readdirp(this.path, readdirSettings)) {
                let fileData = fs.readFileSync(file.fullPath, "utf8");
                let isEntryFile = identifiers.every((identifier) => fileData.includes(identifier));

                if (!isEntryFile) continue;

                EntryFileData = fileData;
                break;
            }
        } else {
            EntryFileData = fs.readFileSync(standardFilePath, "utf8");
        }

        let version = EntryFileData.split("\n")
            .find((line) => line.includes("Version:"))
            .replace(/[^0-9|.]/g, "");

        this.version = version[version.length - 1];

        return this.version;
    }

    async getChecksum() {
        var checksums = null;

        await axios
            .get("https://downloads.wordpress.org/plugin-checksums/" + this.name + "/" + this.version + ".json", {
                validateStatus: function (status) {
                    return status !== 404 || status !== 500;
                },
            })
            .then((response) => {
                this.sourceURL = response.data.source;
                this.zipFile = response.data.zip;
                checksums = response.data.files;
            });

        return checksums;
    }

    async compareChecksum() {
        let pluginChecksums = await this.getChecksum();
        let failedFiles = [];

        if (!pluginChecksums) {
            failedFiles.push("Plugin " + this.name + " Not Found");
            return failedFiles;
        }

        for await (const file of readdirp(this.path, {entryType: "all"})) {
            if (fs.lstatSync(file.fullPath).isDirectory()) continue;
            let checksum = await this.getFileHash(file.fullPath);

            let pluginChecksum = pluginChecksums[file.path].md5;

            if (pluginChecksum instanceof Array) {
                let result = pluginChecksum.every((entryHash) => checksum == entryHash);
                if (!result) {
                    failedFiles.push(file.path);
                }
                continue;
            }

            if (!pluginChecksum || checksum !== pluginChecksum.replaceAll("\\")) {
                failedFiles.push(file.path);
            }
        }

        return failedFiles;
    }

    async isOfficial() {
        if (this.offical) return this.official;

        await axios.get("https://api.wordpress.org/stats/plugin/1.0/" + this.name).then((response) => {
            this.official = response.data ? true : false;
        });

        return this.official;
    }

    getFileHash(filename) {
        return new Promise((resolve, reject) => {
            let shasum = crypto.createHash("md5");
            try {
                let s = fs.ReadStream(filename);
                s.on("data", function (data) {
                    shasum.update(data);
                });
                s.on("end", function () {
                    const hash = shasum.digest("hex");
                    return resolve(hash);
                });
            } catch (error) {
                return reject("calc fail");
            }
        });
    }
}

module.exports = Plugin;
