import { SlashCommandBuilder } from '../../core';
import { playlistAdministrator as pa } from '../services/administrator';
import songBuilder from '../ux/song';
import {
  type CommandInteractionOptionResolver,
  type GuildMember,
} from 'discord.js';

const builder = new SlashCommandBuilder()
  .setName('move')
  .setDescription('Mueve una canción de la cola');

builder.addNumberOption((option) =>
  option
    .setName('de')
    .setDescription('Posición actual de la canción')
    .setRequired(true),
);

builder.addNumberOption((option) =>
  option
    .setName('a')
    .setDescription('Posición nueva de la canción')
    .setRequired(true),
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

  if (playlist.songs.length < 2) {
    await interaction.reply('Debe haber al menos dos canciones en la cola');
  }

  const resolver = interaction.options as CommandInteractionOptionResolver;
  const from = resolver.getNumber('de')! - 1;
  const to = resolver.getNumber('a')! - 1;

  if (
    from < 0 ||
    to < 0 ||
    from === to ||
    from >= playlist.songs.length ||
    to >= playlist.songs.length
  ) {
    await interaction.reply('Parámetros inválidos');
  }

  const song = playlist.songs[from];

  playlist.moveSong(from, to);
  await interaction.reply(`Rola \`${song.title}\` movida a posición ${to}`);
});

export const moveCommand = builder;
