const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config.json');

const commands = [];
const foldersPath = path.join(__dirname, 'src/commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    // If it's a file (not a folder), process it directly
    if (folder.endsWith('.js')) {
        const filePath = path.join(foldersPath, folder);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    } else {
        // If it's a folder, process files inside it
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}

// Since commands are in the src/commands directory directly, let's fix this
const commandFiles = fs.readdirSync(path.join(__dirname, 'src/commands')).filter(file => file.endsWith('.js'));

const commandsArray = [];
for (const file of commandFiles) {
    const filePath = path.join(__dirname, 'src/commands', file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commandsArray.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const rest = new REST().setToken(config.token);

(async () => {
    try {
        console.log(`Started refreshing ${commandsArray.length} application (/) commands.`);

        // Deploy commands globally
        const data = await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commandsArray },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();