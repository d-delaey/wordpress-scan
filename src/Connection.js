import {NodeSSH} from "node-ssh";

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
        try {
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
        } catch (error) {
            console.error("Authentification failed");
            console.error(error);
            process.exit(0);
        }
    }

    /* find a file in a given direcotry that
     * contains a certain string
     */
    async findFileThatContains(path, search) {
        if (!Array.isArray(search)) {
        }

        let files = [];
        for await (const searchItem of search) {
            let commandResult = await this.execCommand("grep -rl '" + searchItem + "' " + path);

            files = files.concat(commandResult.split("\n"));
        }

        var counts = {};
        let EntryFile = null;
        for await (const item of files) {
            counts[item] = (counts[item] || 0) + 1;
            if (counts[item] === search.length) {
                EntryFile = item;
                break;
            }
        }
        return EntryFile;
    }

    /*
     * Get the Content of a certain file
     */
    async getFileData(filePath) {
        let data = await this.execCommand("cat " + filePath);

        return data;
    }

    /*
     * executes a command on the remote Server
     */
    async execCommand(command) {
        if (!this.isConnected()) await this.connect();

        try {
            let execCommand = command;
            let output = null;

            if (this.root) execCommand = "cd " + this.root + " && " + execCommand;

            console.log(execCommand);

            await this.ssh.execCommand(execCommand).then((result) => {
                output = result;
            });

            if (output.stderr) {
                console.error("Command " + command + " has following error:");
                console.error(output.stderr);
            }

            this.closeConnection();
            return output.stdout;
        } catch (error) {
            console.error("Command " + command + " cant be executet");
            console.error("Error", error);

            this.closeConnection();
            process.exit(0);
        }
    }

    /*
     * generates a hash from a remote file
     */
    async getRemoteFileHash(filePath) {}

    async fileExists(filePath) {
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
        if (this.ssh) this.closeConnection();
    }
}

export default Connection;
