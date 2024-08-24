import { type PlaylistManager } from '../services/playlist';
import { EmbedBuilder } from 'discord.js';

type SongArray = typeof PlaylistManager.prototype.songs;

export interface EmbedQueueOptions {
  page?: number;
  queue: SongArray;
}

export default {
  build: ({ queue, page = 0 }: EmbedQueueOptions) => {
    let totalDuration = 0;

    if (!queue.length) {
      return new EmbedBuilder()
        .setColor(0xfa_a6_1a)
        .setTitle('🎶Lista de reproducción🎶')
        .setDescription('No hay canciones en la lista');
    }

    const pages = Math.ceil(queue.length / 10);

    if (page < 0) {
      page = 0;
    } else if (page >= pages) {
      page = pages - 1;
    }

    for (const song of queue) {
      if (song.duration) {
        totalDuration += song.duration;
      }
    }

    const time: string = new Date(totalDuration * 1_000)
      .toISOString()
      .slice(11, 19);

    const songsString = queue
      .slice(page * 10, page * 10)
      .map(
        (song, index) =>
          `\`${index + 1}.\` **[${song.title}](${song.url})**\n(${song.duration || 'Desconocido'})`,
      )
      .join('\n');

    const description = `**${queue.length} canciones en espera**\n(${time})\n${songsString}`;

    return new EmbedBuilder()
      .setColor(0xfa_a6_1a)
      .setTitle('🎶Lista de reproducción🎶')
      .setDescription(description)
      .setFooter({
        text: `Página ${page + 1} de ${Math.ceil(queue.length / 10)}`,
      });
  },
};
