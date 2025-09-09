const { 
    SlashCommandBuilder, 
    ContainerBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ActionRowBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show bot status and activity information'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const client = interaction.client;
            const statusManager = client.statusManager;
            
            if (!statusManager) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xFF0000)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Status Manager Error')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('Status manager not initialized!')
                    );

                return interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const statusInfo = statusManager.getStatusInfo();
            const uptime = client.uptime ? Math.floor(client.uptime / 1000) : 0;
            const uptimeString = this.formatUptime(uptime);

            // Get current presence
            const presence = client.user.presence;
            const currentActivity = presence.activities[0];
            
            const statusContainer = new ContainerBuilder()
                .setAccentColor(statusInfo.isIdle ? 0xFFFF00 : 0x00FF00)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Bot Status')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Current State:** ${statusInfo.isIdle ? 'Idle' : 'Active'}\n**Uptime:** ${uptimeString}\n**Active Queues:** ${statusInfo.activeQueues}\n**Servers:** ${client.guilds.cache.size}\n**Users:** ${client.users.cache.size}\n\n**Discord Status:**\n${currentActivity ? `• Activity: ${currentActivity.name}\n• Type: ${this.getActivityType(currentActivity.type)}\n• State: ${currentActivity.state || 'None'}` : '• No activity set'}`)
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addButtonComponents(
                    new ButtonBuilder()
                        .setCustomId('status_refresh')
                        .setLabel('Refresh Status')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('dashboard_refresh')
                        .setLabel('View Dashboard')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊')
                );

            // Show current music activity if any
            if (statusInfo.currentActivity && !statusInfo.isIdle) {
                const musicContainer = new ContainerBuilder()
                    .setAccentColor(0x0099FF)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Current Music Activity')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**Track:** ${statusInfo.currentActivity.trackTitle}\n**Server:** ${statusInfo.currentActivity.guildName}\n**Paused:** ${statusInfo.currentActivity.paused ? 'Yes' : 'No'}\n**Last Update:** <t:${Math.floor(statusInfo.lastUpdate / 1000)}:R>`)
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addButtonComponents(
                        new ButtonBuilder()
                            .setCustomId('status_force_idle')
                            .setLabel('Force Idle')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('😴')
                    );

                return interaction.editReply({
                    components: [statusContainer, musicContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            } else {
                return interaction.editReply({
                    components: [statusContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

        } catch (error) {
            console.error('Status command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Error Getting Status')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`An error occurred while getting status:\n\n\`\`\`\n${error.message}\n\`\`\``)
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },

    formatUptime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ${minutes % 60}m`;
        
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    },

    getActivityType(type) {
        const types = {
            0: 'Playing',
            1: 'Streaming',
            2: 'Listening',
            3: 'Watching',
            4: 'Custom',
            5: 'Competing'
        };
        return types[type] || 'Unknown';
    }
};