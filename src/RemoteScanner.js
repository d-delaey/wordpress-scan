import Connection from "./Connection";
import axios from "axios";

class RemoteScanner {
    constructor(credentials, root) {
        this.credentials = credentials;
        this.report = [];
        this.connection = null;
        this.root = root;
    }

    async init() {
        await this.setupConnection();
        await this.verifyRoot();
        await this.getWordPressVersion();

        let wordpresFiles = this.scanWordPressCoreFiles();
        let pluginFiles = this.scanPluginFiles();

        await Promise.all([wordpresFiles, pluginFiles]).then((results) => {
            console.log("Wordpress Files:");
            console.log(results[0]);
            console.log("Plugins:");
            console.log(results[1]);
        });
    }
    /*
     *  Check if this.root is actually the WordPress Root
     */
    async verifyRoot() {
        if (!this.connection) return;

        return await this.connection.fileExists(this.root + "/wp-config.php");
    }

    /*
     * initialize the Remote Connection
     */
    async setupConnection() {
        if (this.connection) return this.connection;

        this.connection = new Connection(this.credentials.host, this.credentials.username, this.credentials.password, this.credentials.port, this.root);
        await this.connection.connect();
    }

    /*
     * Gets the WordPress Version from the installed WordPress Instance on the Server
     */
    async getWordPressVersion() {
        if (this.wordpressVersion) return this.wordpressVersion;

        let pathToVersion = "./wp-includes/version.php";
        let data = await this.connection.getFileData(pathToVersion);

        this.wordpressVersion = data
            .split("\n")
            .find((line) => line.includes("wp_version ="))
            .replaceAll(/[^0-9|.]/g, "");

        return this.wordpressVersion;
    }

    /*
     * Gets Official Wordpress Checksums
     */
    async getWordPressCoreChecksums() {
        var checksums = null;

        await axios.get("https://api.wordpress.org/core/checksums/1.0/?version=" + this.wordpressVersion).then((response) => {
            checksums = response.data.checksums[this.wordpressVersion];
        });

        return checksums;
    }

    /*
     * Scans the Wordpress Files by comparing the Official Checksums
     * with the Checksums of the Wordpress Instance
     */
    async scanWordPressCoreFiles() {
        let report = {Modified: [], Unofficial: [], Error: []};

        let skipFolders = ["./wp-content/languages/*", "./wp-content/plugins/*", "./wp-content/cache/*"];

        let officialCoreChecksums = this.getWordPressCoreChecksums();
        let coreChecksums = this.getDirectoryChecksums("./", skipFolders);

        await Promise.all([officialCoreChecksums, coreChecksums]).then((results) => {
            officialCoreChecksums = results[0];
            coreChecksums = results[1];
        });

        for await (const file of coreChecksums) {
            let filePathFromRoot = file[0].replace("./", "");
            let hash = file[1];

            let officialChecksum = officialCoreChecksums[filePathFromRoot];

            if (!officialChecksum) {
                report.Unofficial.push(filePathFromRoot);
                continue;
            }

            if (hash !== officialChecksum.replaceAll("\\")) {
                report.Modified.push(filePathFromRoot);
            }
        }

        let additionalUnofficialFiles = await this.checkForUnofficialFiles();
        report.Unofficial.concat(additionalUnofficialFiles);

        return report;
    }

    async checkForUnofficialFiles() {
        let folders = ["/wp-content/uploads", "/wp-content/languages"];
        let command = "";

        for await (let folder of folders) {
            //find / -name *.mp3
            command += "find '." + folder + "' -name '*.php'";

            if (folders.indexOf(folder) !== folders.length - 1) {
                command += " && ";
            }
        }

        let results = await this.connection.execCommand(command);
        return results.split("\n");
    }

    /*
     * Scans all the Plugins that are installed in the WordPress Instance
     * by comparing the official Plugin Checksums with the Checksums of the Plugin
     * NOTE: does not work with Paid/not Public accessible Plugins
     */
    async scanPluginFiles() {
        let plugins = await this.connection.execCommand("cd ./wp-content/plugins && ls -d */");
        let report = [];
        let checksumPromises = [];

        if (!plugins) {
            return report;
        }

        plugins = plugins.split("\n");

        for await (const plugin of plugins) {
            checksumPromises.push(this.comparePluginChecksums(plugin));
        }

        await Promise.all(checksumPromises).then((results) => {
            report = results;
        });

        return report;
    }

    /* This function takes a plugin name and compares
     * the checksums with the official checksums
     */
    async comparePluginChecksums(plugin) {
        let pluginName = plugin.replace("/", "");
        let pluginReport = {Plugin: pluginName, Modified: [], Unofficial: [], Error: []};

        let pluginEntry = await this.connection.findFileThatContains("./wp-content/plugins/" + plugin, ["Version:", "Plugin Name:", "Text Domain"]);

        if (!pluginEntry) {
            console.log("Plugin " + plugin + " not found");
            return pluginReport;
        }

        let pluginVersion = await this.getPluginVersion(pluginEntry);

        let officialChecksums = this.getOfficialPluginChecksums(pluginName, pluginVersion);
        let pluginChecksums = this.getDirectoryChecksums("./wp-content/plugins/" + pluginName);

        await Promise.all([officialChecksums, pluginChecksums]).then((results) => {
            officialChecksums = results[0];
            pluginChecksums = results[1];
        });

        for await (const file of pluginChecksums) {
            let filePathFromRoot = file[0];
            let filePath = file[0].replace("./wp-content/plugins/" + pluginName + "/", "");
            let hash = file[1];

            let pluginChecksum = officialChecksums[filePath].md5;

            if (!pluginChecksum) {
                pluginReport.UnOfficial.push(filePathFromRoot);
                continue;
            }

            if (pluginChecksum instanceof Array) {
                let result = pluginChecksum.some((entryHash) => hash == entryHash);

                if (!result) {
                    pluginReport.Modified.push(filePathFromRoot);
                }
                continue;
            }

            if (hash !== pluginChecksum.replaceAll("\\")) {
                pluginReport.Modified.push(filePathFromRoot);
            }
        }

        return pluginReport;
    }

    /*
     * Gets the Version of a WordPress Plugin
     */
    async getPluginVersion(pluginEntryPath) {
        let fileData = await this.connection.getFileData(pluginEntryPath);
        return fileData
            .split("\n")
            .find((line) => line.includes("Version:"))
            .replace(/[^0-9|.]/g, "");
    }

    /*
     * Gets all Checksums from a given directory
     */
    async getDirectoryChecksums(directory, skip = null) {
        let command = "find " + directory + " -type f";

        if (skip) {
            var exclude = "";

            if (skip instanceof Array) {
                for await (let folder of skip) {
                    exclude += " -not -path '" + folder + "' ";
                }
            } else {
                exclude += " -not -path '" + skip + "' ";
            }
        }

        if (exclude) command += exclude;

        command += " -exec md5sum {} +";

        let rawChecksums = await this.connection.execCommand(command);
        if (!rawChecksums) return [];

        let checksums = [];
        for await (let checksum of rawChecksums.split("\n")) {
            checksum = checksum.split(" ");
            checksum.splice(1, 1);
            checksums.push(checksum.reverse());
        }

        return checksums;
    }

    async getOfficialPluginChecksums(pluginName, pluginVersion) {
        var checksums = [];

        await axios
            .get("https://downloads.wordpress.org/plugin-checksums/" + pluginName + "/" + pluginVersion + ".json", {
                validateStatus: function (status) {
                    return status !== 404 || status !== 500;
                },
            })
            .then((response) => {
                checksums = response.data.files;
            });

        return checksums;
    }

    destructor() {
        if (this.connection) this.connection.closeConnection();
    }
}

//export {RemoteScannerClass};
export default RemoteScanner;
