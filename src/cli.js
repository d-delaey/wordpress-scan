import arg from "arg";
import RemoteScanner from "./RemoteScanner";

export async function cli(args) {
    console.time("Execution");
    let options = await parseArguments(args);
    console.log(options);

    let scanner = new RemoteScanner(options.sshCredentials, options.wordpressRoot);
    await scanner.init();

    console.timeEnd("Execution");
}

async function parseArguments(rawArgs) {
    const args = arg(
        {
            "--remote": Boolean,
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
    options.localPath = args["--path"];
    options.wordpressRoot = args["--wordpressRoot"];
    options.sshCredentials = {};

    if (args["--remote"]) {
        options.sshCredentials.host = args["--host"] || false;
        options.sshCredentials.username = args["--username"] || false;
        options.sshCredentials.password = args["--password"] || false;
        options.sshCredentials.port = args["--port"] || 22;

        if (!options.sshCredentials.host || !options.sshCredentials.username || !options.sshCredentials.password) {
            throw "Missing required Parameter";
        }
    }

    return options;
}
