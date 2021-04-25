const readdirp = require("readdirp");
const axios = require("axios");
const fs = require("fs");

class Plugin {
    constructor(path, name) {
        this.path = path;
        this.name = name;
        this.failedFiles = [];
    }

    async init() {
        await this.isOfficial();
    }

    async getVersion() {
        if (this.version) return this.version;

        let standardFilePath = this.path + "/" + this.name + ".php";

        if (fs.existsSync(standardFilePath)) return standardFilePath;

        let readdirSettings = {
            entryType: "files",
            depth: 0,
        };

        let identifiers = ["Version", "License", "Text Domain"];

        for await (const file of readdirp(this.path, readdirSettings)) {
            let fileData = fs.readFileSync(file.fullPath, "utf8");
            let isEntryFile = identifiers.every((identifier) => fileData.includes(identifier));

            if (!isEntryFile) continue;

            let version = fileData
                .split("\n")
                .find((line) => line.includes("Version:"))
                .split(" ");

            return version[version.length - 1];
        }

        return this.version;
    }

    async getChecksum() {
        var checksums = null;

        await axios.get("https://api.wordpress.org/plugin-checksums/" + this.name + "/" + this.getVersion() + ".json").then((response) => {
            checksums = response.data.checksums[this.getWordPressVersion()];
        });

        return checksums;
    }

    compareChecksum() {}

    async isOfficial() {
        if (this.offical) return this.official;

        await axios.get("https://api.wordpress.org/stats/plugin/1.0/" + this.name).then((response) => {
            if (!response.data) {
                this.official = false;
            } else {
                this.official = true;
            }
        });

        return this.official;
    }
}

module.exports = Plugin;
