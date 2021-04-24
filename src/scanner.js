const {NodeSSH} = require("node-ssh");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const readdirp = require("readdirp");
const crypto = require("crypto");

class Scanner {
    constructor(credentials, localPath) {
        this.credentials = credentials;

        this.localPath = localPath;
    }

    async start() {
        if (Object.keys(this.credentials).length !== 0) {
            await this.downloadFiles();
        }

        this.compareChecksums();
    }

    async downloadFiles() {
        if (!this.ssh) this.ssh = new NodeSSH();

        let wordpressRootCommand = "cd " + this.credentials.wordpressRoot + " && ";

        if (!this.ssh.isConnected()) {
            let args = {
                host: this.credentials.host,
                username: this.credentials.username,
                port: this.credentials.port,
                password: this.credentials.password,
            };

            await this.ssh.connect(args);
        }

        await this.ssh.getDirectory(this.createDownloadPath(), this.credentials.wordpressRoot, {
            recursive: true,
            concurrency: 10,
        });

        this.ssh.dispose();
    }

    createDownloadPath() {
        if (this.localPath) return this.localPath;

        let path = __dirname.split("/");
        path.pop();
        this.localPath = path.join("/") + "/scans/" + this.credentials.host + "." + this.credentials.username;
        if (!fs.existsSync(this.localPath)) {
            fs.mkdirSync(this.localPath);
        }
        return this.localPath;
    }

    getWordPressVersion() {
        if (this.wordpressVersion) return this.wordpressVersion;

        let versionFile = this.localPath + "/wp-includes/version.php";
        let data = fs.readFileSync(versionFile, "utf8");

        /* @TODO make this better :D */
        // this splits the version.php file into an array where each line is a entry
        // its match the wordpress version between ' ' and then replace ' with nothing so
        // there is only the version left
        this.wordpressVersion = data
            .split("\n")[15]
            .match(/\'(.*)\'/, "$1")[0]
            .replaceAll("'", "");

        return this.wordpressVersion;
    }

    async getCoreChecksums() {
        var checksums = null;

        await axios.get("https://api.wordpress.org/core/checksums/1.0/?version=" + this.getWordPressVersion()).then((response) => {
            checksums = response.data.checksums[this.getWordPressVersion()];
        });

        return checksums;
    }

    async getPluginChecksums(slug, version) {
        var checksums = null;

        await axios.get("https://api.wordpress.org/plugin-checksums/" + slug + "/" + version + ".json").then((response) => {
            checksums = response.data.checksums[this.getWordPressVersion()];
        });

        return checksums;
    }

    async compareCoreChecksums() {
        let coreChecksums = await this.getCoreChecksums();
        let failedFiles = [];

        /* Loop Through every file inside Wordpress Folder except wp-content */

        for await (const file of readdirp(this.localPath, {entryType: "all"})) {
            if (fs.lstatSync(file.fullPath).isDirectory()) continue;
            let checksum = await this.getFileHash(file.fullPath);

            let coreChecksum = coreChecksum[file.path];

            if (!officialChecksum || checksum !== officialChecksum.replaceAll("\\")) {
                failedFiles.push(file.path);
            }
        }

        return failedFiles;
    }

    async comparePluginChecksums() {}

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
                console.log("blub");
                return reject("calc fail");
            }
        });
    }
}

module.exports = Scanner;
