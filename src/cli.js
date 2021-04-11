import arg from "arg";
import inquirer from "inquirer";

import Scanner from "./scanner";

async function parseArguments(rawArgs) {
    const args = arg(
        {
            "--host": String,
            "--username": String,
            "--password": String,
            "--key": String,
            "--port": Number,
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    let options = {
        host: args["--host"] || false,
        username: args["--username"] || false,
        password: args["--password"] || false,
        port: args["--port"] || false,
        key: args["--key"] || false,
    };

    if (!options.host || !options.username) {
        throw new Error("missing required arguments");
    }

    /* If Password is not passed as a Argument start a prompt to fill in the password */
    if (!options.password && !options.key) {
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

    return options;
}

export async function cli(args) {
    let options = await parseArguments(args);

    let scanner = new Scanner(
        options.host,
        options.username,
        options.password,
        options.key
    );

    scanner.connect();
}
