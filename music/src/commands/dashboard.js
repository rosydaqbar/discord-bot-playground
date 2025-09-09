const { 
    SlashCommandBuilder, 
    ContainerBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ActionRowBuilder
} = require('discord.js');
const musicPlayer = require('../services/musicPlayer');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');
const metadataParser = require('../utils/metadataParser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Show the music bot dashboard with server stats and controls'),

    async execute(interaction) {
        const currentTrack = musicPlayer.getCurrentTrack(interaction.guildId);
        
        await interaction.deferReply();

        try {
            // Get music collection stats using metadata parser
            const musicDir = path.resolve(config.musicDirectory);
            let totalFiles = 0;
            let totalSize = 0;
            let formatCounts = {};

            if (await fs.pathExists(musicDir)) {
                const musicFiles = await metadataParser.parseDirectoryMetadata(musicDir, config.supportedFormats);
                totalFiles = musicFiles.length;
                
                for (const file of musicFiles) {
                    totalSize += file.size || 0;
                    const ext = file.format;
                    formatCounts[ext] = (formatCounts[ext] || 0) + 1;
                }
            }

            const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

            // Create header container
            const headerContainer = new ContainerBuilder()
                .setAccentColor(0x0099FF)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Music Bot Dashboard')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Server:** ${interaction.guild.name}\n**Bot Status:** Online and Ready`)
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addButtonComponents(
                    new ButtonBuilder()
                        .setCustomId('dashboard_refresh')
                        .setLabel('Refresh Stats')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('browse_collection')
                        .setLabel('Browse Music')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📁'),
                    new ButtonBuilder()
                        .setCustomId('web_ui')
                        .setLabel('Web UI')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`http://localhost:${config.webPort}`)
                        .setEmoji('🌐')
                );

            // Create server stats container
            const isPlaying = musicPlayer.isPlaying(interaction.guildId);
            const isPaused = musicPlayer.isPaused(interaction.guildId);
            const musicStatus = isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Idle';
            
            const serverStatsContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Server Statistics')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Members:** ${interaction.guild.memberCount}\n**Server Created:** <t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:R>\n**Music Status:** ${musicStatus}\n**Current Volume:** ${currentTrack ? '80%' : 'N/A'}`)
                );

            // Create music collection stats container
            const collectionContainer = new ContainerBuilder()
                .setAccentColor(0xFFFF00)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Music Collection')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Total Files:** ${totalFiles}\n**Total Size:** ${totalSizeGB} GB\n**Formats:** ${Object.entries(formatCounts).map(([ext, count]) => `${ext.toUpperCase().substring(1)}: ${count}`).join(' • ') || 'None'}\n**Directory:** ${config.musicDirectory}`)
                );

            // Create current playback container if music is playing
            let playbackContainer = null;
            if (currentTrack) {
                const isPaused = musicPlayer.isPaused(interaction.guildId);
                playbackContainer = new ContainerBuilder()
                    .setAccentColor(0xFF6600)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('## Now Playing')
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**${currentTrack.title}**\n**Artist:** ${currentTrack.artist || 'Unknown Artist'}\n**Album:** ${currentTrack.album || 'Unknown Album'}\n*Local File*\n${currentTrack.filePath}\nVolume: 80%`)
                    )
                    .addSeparatorComponents(
                        separator => separator
                    )
                    .addButtonComponents(
                        new ButtonBuilder()
                            .setCustomId('music_pause')
                            .setLabel(isPaused ? 'Resume' : 'Pause')
                            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary)
                            .setEmoji(isPaused ? '▶️' : '⏸️'),
                        new ButtonBuilder()
                            .setCustomId('music_stop')
                            .setLabel('Stop')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('⏹️'),
                        new ButtonBuilder()
                            .setCustomId('music_queue')
                            .setLabel('View Current')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📋')
                    );
            }

            // Build components array
            const components = [
                headerContainer,
                serverStatsContainer,
                collectionContainer
            ];

            if (playbackContainer) {
                components.push(playbackContainer);
            }

            return interaction.editReply({ 
                components: components,
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Dashboard command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Error Loading Dashboard')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`An error occurred while loading the dashboard:\n\n\`\`\`\n${error.message}\n\`\`\``)
                );

            return interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};