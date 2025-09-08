const { 
    SlashCommandBuilder, 
    ContainerBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags
} = require('discord.js');
const path = require('path');
const musicPlayer = require('../services/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show information about the currently playing song'),

    async execute(interaction) {
        const currentTrack = musicPlayer.getCurrentTrack(interaction.guildId);

        if (!currentTrack) {
            const noMusicContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## No Music Playing')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('No music is currently playing!')
                );

            return interaction.reply({
                components: [noMusicContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const isPlaying = musicPlayer.isPlaying(interaction.guildId);
        const isPaused = musicPlayer.isPaused(interaction.guildId);
        
        if (!isPlaying && !isPaused) {
            const noMusicContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## No Music Playing')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('No music is currently playing!')
                );

            return interaction.reply({
                components: [noMusicContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
        
        const startedTime = Math.floor(currentTrack.startTime / 1000);
        const durationText = currentTrack.duration ? `${Math.floor(currentTrack.duration / 60)}:${Math.floor(currentTrack.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
        const status = isPaused ? '**PAUSED**' : '**PLAYING**';

        // Get queue info for button states
        const queue = await musicPlayer.getQueue(interaction.guildId);
        const hasNext = queue.length > 0;
        const hasPrevious = musicPlayer.hasPreviousTrack(interaction.guildId);

        // Create buttons outside the container
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏮️')
                    .setDisabled(!hasPrevious),
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
                    .setCustomId('music_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏭️')
                    .setDisabled(!hasNext),
                new ButtonBuilder()
                    .setCustomId('view_queue')
                    .setLabel('Queue')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋')
            );

        const nowPlayingContainer = new ContainerBuilder()
            .setAccentColor(isPaused ? 0xFFFF00 : 0x00FF00)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('## Now Playing')
            )
            .addSeparatorComponents(
                separator => separator
            );

        // Add artwork if available
        if (currentTrack.artwork) {
            // Create attachment for the artwork
            const attachment = new AttachmentBuilder(currentTrack.artwork, { name: 'album-artwork.jpg' });
            
            // Add track info with artwork in a section
            nowPlayingContainer.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**${currentTrack.title}**\n**Artist:** ${currentTrack.artist || 'Unknown Artist'}\n**Album:** ${currentTrack.album || 'Unknown Album'}\n\n**Duration:** ${durationText}\n**Started:** <t:${startedTime}:R>\n**Status:** ${status}`)
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL('attachment://album-artwork.jpg')
                    )
            );
            
            // Add attachment to the reply
            return interaction.reply({ 
                files: [attachment],
                components: [nowPlayingContainer, buttonRow],
                flags: MessageFlags.IsComponentsV2
            });
        } else {
            // No artwork available, use simple text display
            nowPlayingContainer.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**${currentTrack.title}**\n**Artist:** ${currentTrack.artist || 'Unknown Artist'}\n**Album:** ${currentTrack.album || 'Unknown Album'}\n\n**Duration:** ${durationText}\n**Started:** <t:${startedTime}:R>\n**Status:** ${status}`)
            );
        }

        // Return the reply (attachment case is handled above)
        return interaction.reply({ 
            components: [nowPlayingContainer, buttonRow],
            flags: MessageFlags.IsComponentsV2
        });
    },
};