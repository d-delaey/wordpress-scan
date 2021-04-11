const { NodeSSH } = require("node-ssh");

class Scanner {
    constructor(host, username, password, key, port = 22) {
        this.host = host;
        this.username = username;
        this.password = password;
        this.key = key;
        this.port = port;
    }

    connect() {
        if (!this.ssh) this.ssh = new NodeSSH();

        let args = {
            host: this.host,
            username: this.username,
            port: this.port,
        };

        if (this.key) args.key = this.key;

        console.log(args);

        this.ssh.connect(args);
        console.log("test");
        //this.getWordPressVersion();
        //console.log(this.ssh.isConnected());
    }

    getWordPressVersion() {
        this.ssh.isConnected();
        this.ssh.execCommand("ls", [], { cwd: "/" }).then(function (result) {
            console.log("STDOUT: " + result);
        });
    }
}

module.exports = Scanner;
