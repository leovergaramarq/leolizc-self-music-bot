import { SlashCommandBuilder } from '../../core';
import { playlistAdministrator as pa } from '../services/administrator';
import {
  type CommandInteractionOptionResolver,
  type GuildMember,
} from 'discord.js';

const builder = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Elimina una canción');

builder.addNumberOption((option) =>
  option
    .setName('posicion')
    .setDescription('Posición actual de la canción')
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

  if (playlist.songs.length < 1) {
    await interaction.reply('Debe haber al menos una canción en la cola');
    return;
  }

  const resolver = interaction.options as CommandInteractionOptionResolver;
  const index = resolver.getNumber('posicion')! - 1;

  if (index < 0 || index >= playlist.songs.length) {
    await interaction.reply('Posición inválida');
    return;
  }

  const song = playlist.songs[index];

  playlist.removeSong(index);
  await interaction.reply(`Rola \`${song.title}\` eliminada de la cola`);
});

export const removeCommand = builder;
