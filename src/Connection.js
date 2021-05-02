const {NodeSSH} = require("node-ssh");

const Helper = require("./Helper");

/*
 * This Class Handels the SSH Connection to the Remote Server
 *  and performs certain task on the Remote Server
 */
class Connection {
    constructor(host, username, password, port, root = null) {
        this.host = host;
        this.username = username;
        this.password = password;
        this.port = port;
        this.root = root;
    }

    /*
     * Connect to Remote Server
     */
    async connect() {
        if (!this.ssh) this.ssh = new NodeSSH();

        if (!this.ssh.isConnected()) {
            let args = {
                host: this.host,
                username: this.username,
                password: this.password,
                port: this.port,
            };

            await this.ssh.connect(args);
        }
    }

    /* find a file in a given direcotry that
     * contains a certain string
     */
    async findFileThatContains(path, search) {}

    /*
     * Get the Content of a certain file
     */
    async getFileData(filePath) {}

    /*
     * executes a command on the remote Server
     */
    async execCommand(command) {
        if (!this.isConnected()) this.connect();

        let execCommand = command;
        let output = null;

        if (this.root) execCommand = "cd " + this.root + " && " + execCommand;

        console.log();

        await this.ssh.execCommand(execCommand).then((result) => {
            output = result;
        });

        return output;
    }

    /*
     * generates a hash from a remote file
     */
    async getRemoteFileHash(filePath) {}

    async fileExists(filePath) {
        if (!this.isConnected()) await this.connect();

        let data = await this.execCommand("ls " + filePath);

        return data.stderr ? false : true;
    }

    isConnected() {
        return this.ssh.isConnected();
    }

    /*
     * Close Connection
     */
    closeConnection() {
        if (!this.ssh) return;

        this.ssh.dispose();
    }

    destructor() {
        if (this.ssh) {
            this.closeConnection();
        }
    }
}

module.exports = Connection;
