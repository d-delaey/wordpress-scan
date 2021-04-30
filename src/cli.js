const arg = require("arg");
const inquirer = require("inquirer");
const Scanner = require("./scanner");

export async function cli(args) {
    console.time("Execution");
    let options = await parseArguments(args);

    let scanner = new Scanner(options.sshCredentials, options.localPath);
    console.log(process.cwd());

    await scanner.start();
    console.timeEnd("Execution");
}

async function parseArguments(rawArgs) {
    const args = arg(
        {
            "--download": Boolean,
            "--host": String,
            "--username": String,
            "--password": String,
            "--port": Number,
            "--wordpressRoot": String,

            "--path": String,
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    let options = {};
    options.downloadFiles = false;
    options.sshCredentials = {};
    options.localPath = args["--path"];

    if (!options.localPath && !args["--download"]) {
        throw "Missing required Parameter";
    }

    if (args["--download"]) {
        options.sshCredentials.downloadFiles = true;

        options.sshCredentials.host = args["--host"] || false;
        options.sshCredentials.username = args["--username"] || false;
        options.sshCredentials.password = args["--password"] || false;
        options.sshCredentials.port = args["--port"] || 22;
        options.sshCredentials.wordpressRoot = args["--wordpressRoot"] || false;

        if (!options.sshCredentials.host || !options.sshCredentials.username || !options.sshCredentials.password) {
            throw "Missing required Parameter";
        }
    }

    return options;
}
