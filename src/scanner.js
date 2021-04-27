const {NodeSSH} = require("node-ssh");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const readdirp = require("readdirp");
const crypto = require("crypto");

const Plugin = require("./plugin");

class Scanner {
    constructor(credentials, localPath) {
        this.credentials = credentials;
        this.localPath = localPath;
    }

    async start() {
        if (Object.keys(this.credentials).length !== 0) {
            await this.downloadFiles();
        }

        const [failedPluginFiles, failedCoreFiles] = await Promise.all([this.comparePluginChecksums(), this.compareCoreChecksums()]);
        let failedFiles = failedPluginFiles.concat(failedCoreFiles);
        console.log(failedFiles);
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
        let scanPath = path.join("/") + "/scans/";
        this.localPath = scanPath + this.credentials.host + "." + this.credentials.username;

        if (!fs.existsSync(scanPath)) {
            fs.mkdirSync(scanPath);
        }
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

    async compareCoreChecksums() {
        let coreChecksums = await this.getCoreChecksums();
        let failedFiles = [];

        let readdirSettings = {
            entryType: "all",
            directoryFilter: ["!languages", "!plugins", "!upgrade", "!cache"],
        };

        /* Loop Through every file inside Wordpress Folder
         *  and compare official core cheksum with checksum of the file
         */
        for await (const file of readdirp(this.localPath, readdirSettings)) {
            if (fs.lstatSync(file.fullPath).isDirectory()) continue;
            let checksum = await this.getFileHash(file.fullPath);

            let coreChecksum = coreChecksums[file.path];

            if (!coreChecksum || checksum !== coreChecksum.replaceAll("\\")) {
                failedFiles.push(file.path);
            }
        }

        return failedFiles;
    }

    async comparePluginChecksums() {
        let coreChecksums = await this.getCoreChecksums();
        let failedFiles = [];

        let readdirSettings = {
            entryType: "directories",
            depth: 0,
        };

        for await (const file of readdirp(this.localPath + "/wp-content/plugins", readdirSettings)) {
            let plugin = new Plugin(file.fullPath, file.basename);
            await plugin.init();
            if (!plugin.official) continue;

            failedFiles = await plugin.compareChecksum();
        }

        return failedFiles;
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

module.exports = Scanner;
