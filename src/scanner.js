const { NodeSSH } = require("node-ssh");
const fs = require('fs');

class Scanner {
    constructor(host, username, password, key, passphrase, port = 22, wordpressRoot = null) {
        this.host = host;
        this.username = username;
        this.port = port;
        this.password = password;
        this.privateKey = key;
        this.passphrase = passphrase;
        this.wordpressRoot = "/var/www/vhosts/delaey.space/httpdocs";
        this.changeToWordpressRoot = 'cd ' + this.wordpressRoot + ' && '; 
        this.wordpressVersion = null;
    }

    getConnection() {
        return this.ssh.getConnection();
    }

    async connect() {
        if (!this.ssh) this.ssh = new NodeSSH();

        let args = {
            host: this.host,
            username: this.username,
            port: this.port,
        };

        if (this.privateKey && this.passphrase) {
            args.privateKey = this.privateKey;
            args.passphrase = this.passphrase;
        }

        await this.ssh.connect(args);

        this.getWordPressVersion();
    }

    getWordPressVersion() {
        if(this.wordpressVersion) return this.wordpressVersion;

        if(!this.ssh.isConnected) this.connect;

        this.ssh.execCommand(this.changeToWordpressRoot + 'cat ./wp-includes/version.php', [], { cwd: this.wordpressRoot }).then( (result) => {
            if(!result.stdout || result.stderror) {
                console.log("Error: Cannot Find WordPress Version");
            }
            let fileContent = result.stdout.split('\n')
            let versionLine = fileContent.find( element => element.includes('wp_version ='));
            let wordpressVersion = versionLine.match(/\'([^\']+)\'/)[1];
            this.wordpressVersion = wordpressVersion;
        });

        return this.wordpressVersion;
    }

    getOfficialWordpressChecksums() {

    }

    getCurrentWordpressChecksums() {

    }

    compareChecksums() {

    }


}

module.exports = Scanner;
