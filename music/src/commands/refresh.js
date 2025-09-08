const { 
    SlashCommandBuilder, 
    ContainerBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits,
    ActionRowBuilder
} = require('discord.js');
const CommandDeployer = require('../utils/commandDeployer');
const config = require('../../config.json');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('refresh')
        .setDescription('Refresh and redeploy bot commands (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Load all commands
            const commands = [];
            const commandsPath = path.join(__dirname, '../commands');
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                if (file === 'refresh.js') continue; // Skip self
                
                const filePath = path.join(commandsPath, file);
                delete require.cache[require.resolve(filePath)]; // Clear cache
                const command = require(filePath);
                
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                }
            }

            // Deploy commands
            const commandDeployer = new CommandDeployer(config);
            
            // Clear cache to force redeployment
            await commandDeployer.clearCache();
            
            const success = await commandDeployer.deployCommands(commands);

            if (success) {
                const successContainer = new ContainerBuilder()
                    .setAccentColor(0x00FF00)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Commands Refreshed Successfully!')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**Total Commands:** ${commands.length}\n**Deployment:** Complete\n**Time:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n**Available Commands:**\n${commands.map(cmd => `• \`/${cmd.name}\` - ${cmd.description}`).join('\n')}`)
                    );

                const buttonRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('test_commands')
                            .setLabel('Test Commands')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🧪'),
                        new ButtonBuilder()
                            .setCustomId('dashboard_refresh')
                            .setLabel('View Dashboard')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📊')
                    );

                return interaction.editReply({
                    components: [successContainer, buttonRow],
                    flags: MessageFlags.IsComponentsV2
                });
            } else {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xFF0000)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Command Refresh Failed')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('Please check the console for error details. You may need to:\n• Verify your bot token and client ID\n• Ensure the bot has proper permissions\n• Check your internet connection')
                    );

                return interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

        } catch (error) {
            console.error('Refresh command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Error Refreshing Commands')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`An error occurred while refreshing commands:\n\n\`\`\`\n${error.message}\n\`\`\``)
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};