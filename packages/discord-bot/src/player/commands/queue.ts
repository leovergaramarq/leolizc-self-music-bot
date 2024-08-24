import { SlashCommandBuilder } from '../../core';
import { playlistAdministrator as pa } from '../services/administrator';
import queueEmbedBuilder from '../ux/queue';
import {
  type CommandInteractionOptionResolver,
  type GuildMember,
} from 'discord.js';

const builder = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Muestra la lista de canciones en cola');

builder.addIntegerOption((option) =>
  option
    .setName('page')
    .setDescription('Página de la lista de reproducción')
    .setRequired(false),
);

builder.setAction(async (interaction) => {
  const channel = (interaction.member as GuildMember)?.voice.channel;

  if (!channel) {
    await interaction.reply('Debes estar en un canal de voz');
    return;
  }

  const playlist = pa.get(channel);

  if (!playlist) {
    await interaction.reply('No hay canciones en la lista');
    return;
  }

  const queue = playlist.songs;
  const resolver = interaction.options as CommandInteractionOptionResolver;

  const page = (resolver.getInteger('page') ?? 1) - 1;

  const embedInfo = queueEmbedBuilder.build({ page, queue });
  await interaction.reply({ embeds: [embedInfo] });
});

export const queueCommand = builder;
