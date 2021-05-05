/* SSH Connection Class */
import Connection from "./Connection";
import axios from "axios";
//const Connection = require("./Connection");

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

        await this.scanPluginFiles();
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
     * Scans the Wordpress Files by comparing the Official Checksums
     * with the Checksums of the Wordpress Instance
     */
    async scanWordpressFiles() {}

    /*
     * Scans all the Plugins that are installed in the WordPress Instance
     * by comparing the official Plugin Checksums with the Checksums of the Plugin
     * NOTE: does not work with Paid/not Public accessible Plugins
     */
    async scanPluginFiles() {
        let plugins = await this.connection.execCommand("cd ./wp-content/plugins && ls -d */");
        let report = [];

        if (!plugins) {
            return report;
        }

        plugins = plugins.split("\n");

        for await (const plugin of plugins) {
            let pluginName = plugin.replace("/", "");

            let pluginEntry = await this.connection.findFileThatContains("./wp-content/plugins/" + plugin, ["Version:", "License", "Text Domain"]);

            if (!pluginEntry) {
                console.log("Plugin " + plugin + " not found");
                continue;
            }
            console.log("blub");

            let pluginVersion = await this.getPluginVersion(pluginEntry);
            console.log(pluginVersion);

            let pluginChecksums = await this.pluginChecksum(pluginName, pluginVersion);
        }
    }

    async pluginChecksum(pluginName, pluginVersion) {
        var checksums = null;

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
