/* SSH Connection Class */
const Connection = require("./Connection");

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
    getWordPressVersion() {}

    /*
     * Scans the Wordpress Files by comparing the Official Checksums
     * with the Checksums of the Wordpress Instance
     */
    async scanWordpress() {}

    /*
     * Scans all the Plugins that are installed in the WordPress Instance
     * by comparing the official Plugin Checksums with the Checksums of the Plugin
     * NOTE: does not work with Paid/not Public accessible Plugins
     */
    async scanPlugins() {}

    destructor() {
        if (this.connection) {
            this.connection.closeConnection();
        }
    }
}

module.exports = RemoteScanner;
