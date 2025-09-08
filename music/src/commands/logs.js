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
const logger = require('../utils/logger');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('View bot logging statistics and recent activity (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Log action to perform')
                .addChoices(
                    { name: 'Statistics', value: 'stats' },
                    { name: 'Recent Activity', value: 'recent' },
                    { name: 'Clean Old Logs', value: 'clean' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const action = interaction.options.getString('action') || 'stats';

            switch (action) {
                case 'stats':
                    await this.showLogStats(interaction);
                    break;
                case 'recent':
                    await this.showRecentActivity(interaction);
                    break;
                case 'clean':
                    await this.cleanLogs(interaction);
                    break;
                default:
                    await this.showLogStats(interaction);
            }

        } catch (error) {
            await logger.error('Logs command error', { error: error.message });
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Error Accessing Logs')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`An error occurred while accessing logs:\n\n\`\`\`\n${error.message}\n\`\`\``)
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },

    async showLogStats(interaction) {
        const stats = await logger.getLogStats();
        
        if (stats.error) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Error Getting Log Statistics')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`Failed to retrieve log statistics:\n\n\`\`\`\n${stats.error}\n\`\`\``)
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const statsContainer = new ContainerBuilder()
            .setAccentColor(0x0099FF)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('## Bot Logging Statistics')
            )
            .addSeparatorComponents(
                separator => separator
            )
                            .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Log Files:** ${stats.files}\n**Total Entries:** ${stats.totalLines.toLocaleString()}\n**Total Size:** ${stats.totalSize} KB\n**Oldest Log:** ${stats.oldestLog || 'None'}\n**Newest Log:** ${stats.newestLog || 'None'}\n\n**Log Types Tracked:**\n• Slash Commands\n• Button Interactions\n• Music Events\n• Web API Requests\n• Errors & Warnings\n• System Events`)
                );

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('logs_recent')
                    .setLabel('Recent Activity')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('logs_clean')
                    .setLabel('Clean Old Logs')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🧹'),
                new ButtonBuilder()
                    .setCustomId('logs_refresh')
                    .setLabel('Refresh Stats')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );

        return interaction.editReply({
            components: [statsContainer, buttonRow],
            flags: MessageFlags.IsComponentsV2
        });
    },

    async showRecentActivity(interaction) {
        try {
            const logDir = path.join(__dirname, '../../logs');
            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(logDir, `${today}.log`);

            if (!await fs.pathExists(logFile)) {
                const noLogsContainer = new ContainerBuilder()
                    .setAccentColor(0xFFFF00)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## No Activity Logged Today')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('No activity has been logged today yet.\n\nLogs will appear here as users interact with the bot.')
                    );

                return interaction.editReply({
                    components: [noLogsContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const logContent = await fs.readFile(logFile, 'utf8');
            const logLines = logContent.trim().split('\n').filter(line => line.trim());
            const recentLogs = logLines.slice(-20); // Last 20 entries

            let activitySummary = {
                commands: 0,
                buttons: 0,
                music: 0,
                web: 0,
                errors: 0
            };

            const recentEntries = recentLogs.map(line => {
                try {
                    const entry = JSON.parse(line);
                    
                    // Count activity types
                    switch (entry.level) {
                        case 'command': activitySummary.commands++; break;
                        case 'button': activitySummary.buttons++; break;
                        case 'music': activitySummary.music++; break;
                        case 'error': activitySummary.errors++; break;
                        case 'info': 
                            if (entry.message.includes('Web API')) activitySummary.web++;
                            break;
                    }

                    const time = new Date(entry.timestamp).toLocaleTimeString();
                    const emoji = this.getEmojiForLevel(entry.level);
                    return `${emoji} \`${time}\` ${entry.message}`;
                } catch {
                    return null;
                }
            }).filter(Boolean);

            const activityContainer = new ContainerBuilder()
                .setAccentColor(0x0099FF)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Recent Activity')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Today's Summary:**\nCommands: ${activitySummary.commands}\nButtons: ${activitySummary.buttons}\nMusic: ${activitySummary.music}\nWeb API: ${activitySummary.web}\nErrors: ${activitySummary.errors}\n\n**Recent Entries:**\n${recentEntries.slice(-10).join('\n')}`)
                );

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('logs_stats')
                        .setLabel('View Statistics')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId('logs_refresh')
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄')
                );

            return interaction.editReply({
                components: [activityContainer, buttonRow],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            await logger.error('Error showing recent activity', { error: error.message });
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Error Reading Recent Activity')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`An error occurred while reading recent activity:\n\n\`\`\`\n${error.message}\n\`\`\``)
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },

    async cleanLogs(interaction) {
        try {
            const deletedCount = await logger.cleanOldLogs(30);
            
            const cleanContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Log Cleanup Complete')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Files Deleted:** ${deletedCount}\n**Retention:** 30 days\n**Cleaned At:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n${deletedCount > 0 ? 'Old log files have been removed to free up space.' : 'No old log files found - logs are already clean!'}`)
                );

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('logs_stats')
                        .setLabel('View Updated Stats')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📊')
                );

            return interaction.editReply({
                components: [cleanContainer, buttonRow],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            await logger.error('Error cleaning logs', { error: error.message });
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Error Cleaning Logs')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`An error occurred while cleaning logs:\n\n\`\`\`\n${error.message}\n\`\`\``)
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },

    getEmojiForLevel(level) {
        switch (level) {
            case 'command': return '🎵';
            case 'button': return '🔘';
            case 'music': return '🎶';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'success': return '✅';
            case 'info': return 'ℹ️';
            default: return '📝';
        }
    }
};