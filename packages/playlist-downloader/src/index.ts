/* eslint-disable canonical/filename-match-exported */
import {
  type PlaylistOptions,
  type VideoOptions,
} from './core/entities/options';
import { YoutubeService } from './infrastructure/service/youtube';
import { PlayList } from './interface/playlist';

const service = new YoutubeService();

interface PldlOptionsType {
  playlistOptions?: PlaylistOptions;
  videoOptions?: VideoOptions;
}

export const pldl = async (url: string, options?: PldlOptionsType) => {
  const playlist = await service.getPlaylist(url, options?.playlistOptions);
  return new PlayList(playlist, service, options?.videoOptions);
};

pldl.service = service;

export default pldl;
export { PlayList } from './interface/playlist';
export { Video } from './interface/video';
