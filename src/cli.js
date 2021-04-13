import arg from "arg";
import inquirer from "inquirer";

import Scanner from "./scanner";

async function parseArguments(rawArgs) {
    const args = arg(
        {
            "--host": String,
            "--username": String,
            "--password": String,
            "--port": Number,
            "--key": String,
            "--passphrase": String,
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    let options = {
        host: args["--host"] || false,
        username: args["--username"] || false,
        password: args["--password"] || false,
        port: args["--port"] || 22,
        privateKey: args["--key"] || false,
        passphrase: args["--passphrase"] || false,
    };

    if (!options.host || !options.username) {
        throw new Error("missing required arguments");
    }

    /* If Password is not passed as a Argument start a prompt to fill in the password */
    if (!options.password && !options.privateKey) {
        await inquirer
            .prompt({
                type: "input",
                name: "password",
                message: "Enter SSH Pasword:",
            })
            .then((password) => {
                options.password = password.password;
            });
    }

    if (options.privateKey && !options.passphrase) {
        await inquirer
            .prompt({
                type: "input",
                name: "passphrase",
                message: "Enter Passphrase Password:",
            })
            .then((passphrase) => {
                options.passphrase = passphrase.passphrase;
            });
    }

    return options;
}

export async function cli(args) {
    let options = await parseArguments(args);

    let scanner = new Scanner(
        options.host,
        options.username,
        options.password,
        options.privateKey,
        options.passphrase,
        options.port
    );

    scanner.connect();
}
