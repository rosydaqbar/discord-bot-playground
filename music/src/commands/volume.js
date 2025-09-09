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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the music volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)),

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

        const volume = interaction.options.getInteger('level');
        const success = musicPlayer.setVolume(interaction.guildId, volume / 100);
        
        if (success) {
            // Create volume bar visualization
            const volumeBar = '█'.repeat(Math.floor(volume / 10)) + '░'.repeat(10 - Math.floor(volume / 10));
            
            const volumeContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Volume Updated')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`Volume set to **${volume}%**\n\n**Volume Level:**\n\`${volumeBar}\` ${volume}%`)
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addButtonComponents(
                    new ButtonBuilder()
                        .setCustomId('volume_mute')
                        .setLabel('Mute')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔇'),
                    new ButtonBuilder()
                        .setCustomId('volume_low')
                        .setLabel('Low')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔉'),
                    new ButtonBuilder()
                        .setCustomId('volume_high')
                        .setLabel('High')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔊')
                );

            return interaction.reply({
                components: [volumeContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } else {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('## Error')
                )
                .addSeparatorComponents(
                    separator => separator
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('Failed to set volume!')
                );

            return interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};