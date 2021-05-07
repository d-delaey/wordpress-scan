import arg from "arg";
import RemoteScanner from "./RemoteScanner";

export async function cli(args) {
    console.time("Execution Time");
    let options = await parseArguments(args);

    let scanner = new RemoteScanner(options.sshCredentials, options.path);
    await scanner.init();

    console.timeEnd("Execution Time");
}

async function parseArguments(rawArgs) {
    const args = arg(
        {
            "--host": String,
            "--username": String,
            "--password": String,
            "--port": Number,
            "--path": String,
            "--path": String,
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    let options = {};
    options.path = args["--path"];
    options.sshCredentials = {};

    options.sshCredentials.host = args["--host"] || false;
    options.sshCredentials.username = args["--username"] || false;
    options.sshCredentials.password = args["--password"] || false;
    options.sshCredentials.port = args["--port"] || 22;

    if (!options.sshCredentials.host || !options.sshCredentials.username || !options.sshCredentials.password) {
        throw "Missing required Parameter";
    }

    return options;
}
