// eslint-disable-next-line simple-import-sort/imports
import { parse } from 'node-html-parser';
import { URL } from 'url';
import { type StreamMedia, type Video } from '../../core/entities/media';
import {
  type VideoOptions,
  type PlaylistOptions,
} from '../../core/entities/options';
import { type Playlist } from '../../core/entities/playlist';
import { type YoutubeService as YTService } from '../../core/services/youtube';

import { type Readable } from 'stream';
import { fetchWithTimeout } from '../../utils/fetch';
import ytpl from '@distube/ytpl';
import ytdl from '@distube/ytdl-core';

export class InvidiousService implements YTService {
  private readonly invidiousHostsUrl =
    'https://api.invidious.io/instances.json';

  private baseApiUrls: string[] = [
    'https://inv.nadeko.net',
    // 'https://invidious.jing.rocks',
    // 'https://invidious.privacyredirect.com',
  ];

  private baseVideoUrls: string[] = ['https://inv.nadeko.net'];

  private baseUrlIndex: number = 0;
  private apiBaseUrlIndex: number = 0;

  constructor() {
    this.setBaseUrls().catch(console.error);
  }

  private get baseVideoUrl(): string {
    return this.baseVideoUrls[this.baseUrlIndex];
  }

  private get baseApiUrl(): string {
    return `${this.baseApiUrls[this.apiBaseUrlIndex]}/api/v1`;
  }

  private nextBaseVideoUrl() {
    this.baseUrlIndex = (this.baseUrlIndex + 1) % this.baseVideoUrls.length;
  }

  private nextBaseApiUrl() {
    this.apiBaseUrlIndex = (this.apiBaseUrlIndex + 1) % this.baseApiUrls.length;
  }

  async downloadVideoUrl(
    videoUrl: string,
    _?: VideoOptions,
  ): Promise<StreamMedia> {
    const video = await this.getVideo(videoUrl);
    const stream = await this.getVideoStream(videoUrl);

    return {
      id: video.id,
      stream,
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      url: videoUrl,
    };
  }

  async downloadVideo(video: Video): Promise<StreamMedia> {
    const stream = await this.getVideoStream(video.url);

    return {
      id: video.id,
      stream,
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      url: video.url,
    };
  }

  async getPlaylist(url: string, _?: PlaylistOptions): Promise<Playlist> {
    const playlistId = this.getPlaylistIdFromUrl(url);
    if (!playlistId) {
      throw new Error('Invalid URL');
    }

    const numberAttemptsApi = this.baseApiUrls.length; // max times to make the request - at least 1
    let errorApiVideo;
    let playlist;

    for (let index = 0; index < numberAttemptsApi; index++) {
      try {
        const urlFetch = `${this.baseApiUrl}/playlists/${playlistId}`;
        console.log(`Getting playlist ${urlFetch}`);
        const response = await fetchWithTimeout(urlFetch, {
          timeout: 3_000,
        });
        playlist = await response.json();

        if (playlist['error']) {
          throw new Error('Playlist unavailable');
        }

        errorApiVideo = undefined;
        break;
      } catch (error) {
        errorApiVideo = error;
        this.nextBaseApiUrl();
      }
    }

    if (errorApiVideo || !playlist) {
      throw errorApiVideo;
    }

    return {
      id: playlist['playlistId'],
      title: playlist['title'],
      url,
      videos: playlist['videos']
        .filter((videoInfo: Record<string, unknown>) =>
          this.isVideoAvailable(videoInfo),
        )
        .map((videoInfo: Record<string, unknown>) => ({
          duration: videoInfo['lengthSeconds'],
          id: videoInfo['videoId'],
          thumbnailUrl: this.findThumbnail(videoInfo),
          title: videoInfo['title'],
          url: `https://www.youtube.com/watch?v=${videoInfo['videoId']}`,
        })),
    };
  }

  async getVideo(videoUrl: string): Promise<Video> {
    const videoId = this.getVideoIdFromUrl(videoUrl);
    if (!videoId) {
      throw new Error('Invalid URL');
    }

    let responseApi;
    const numberAttemptsApi = this.baseApiUrls.length; // max times to make the request - at least 1
    let errorApi;
    let videoInfo;

    for (let index = 0; index < numberAttemptsApi; index++) {
      try {
        const urlFetch = `${this.baseApiUrl}/videos/${videoId}`;
        console.log('Fetching API URL', urlFetch);
        responseApi = await fetchWithTimeout(urlFetch, {
          timeout: 3_000,
        });

        videoInfo = await responseApi.json();

        if (!this.isVideoAvailable(videoInfo)) {
          throw new Error('Video unavailable');
        }

        errorApi = undefined;
        break;
      } catch (error) {
        errorApi = error;
        this.nextBaseApiUrl();
      }
    }

    if (errorApi || !videoInfo) {
      throw errorApi;
    }

    return {
      duration: Number(videoInfo['lengthSeconds']),
      id: videoInfo['videoId'],
      thumbnailUrl: this.findThumbnail(videoInfo),
      title: videoInfo['title'],
      url: `https://www.youtube.com/watch?v=${videoInfo['videoId']}`,
    };
  }

  validatePlaylistUrl(url: string): boolean {
    return ytpl.validateID(url);
  }

  validateVideoUrl(url: string): boolean {
    return ytdl.validateURL(url);
  }

  private findThumbnail(videoInfo: Record<string, unknown>) {
    const thumbnails = videoInfo.videoThumbnails as Array<
      Record<string, unknown>
    >;
    let index = thumbnails.findIndex(
      (vidThumb: Record<string, unknown>) => vidThumb.quality === 'medium',
    );
    if (index === -1) index = 0;
    return String(thumbnails[index].url);
  }

  private getVideoIdFromUrl(url: string) {
    return new URL(url).searchParams.get('v');
  }

  private getPlaylistIdFromUrl(url: string) {
    return new URL(url).searchParams.get('list');
  }

  private isVideoAvailable(videoInfo: Record<string, unknown>) {
    return (
      !videoInfo['error'] &&
      !['[Deleted video]', '[Private video]'].includes(
        videoInfo['title'] as string,
      )
    );
  }

  private async getVideoStream(videoUrl: string): Promise<Readable> {
    const videoId = this.getVideoIdFromUrl(videoUrl);
    const numberAttempts = this.baseVideoUrls.length; // max times to make the request - at least 1
    let errorHtml;
    let stream;

    for (let index = 0; index < numberAttempts; index++) {
      try {
        const videoUrlInvidious = `${this.baseVideoUrl}/watch?v=${videoId}`;
        console.log(`Fetching HTML ${videoUrlInvidious}`);

        const responseHtml = await fetchWithTimeout(videoUrlInvidious, {
          timeout: 10_000,
        });
        const html = (await responseHtml!.text()).trim();

        if (!html) {
          throw new Error(`Empty HTML received for ${videoUrlInvidious}`);
        }

        const root = parse(html);
        const element = root.querySelector(
          '#player-container video source:last-of-type',
        );

        if (!element) {
          throw new Error('No <source/> element found');
        }

        const endpointVideoResource = element.getAttribute('src');
        if (!endpointVideoResource) {
          throw new Error('Empty src attribute in </source> element');
        }

        const downloadUrl = `${this.baseVideoUrl}${endpointVideoResource}`;
        console.log('Download URL', downloadUrl);
        const response = await fetch(downloadUrl);

        if (!response.ok) {
          throw new Error(`Error en la descarga: ${response.statusText}`);
        }

        stream = response.body as unknown as Readable;

        errorHtml = undefined;
        break;
      } catch (error) {
        errorHtml = error;
        this.nextBaseVideoUrl();
      }
    }

    if (errorHtml || !stream) {
      throw errorHtml;
    }

    return stream;
  }

  async setBaseUrls() {
    try {
      const response = await fetchWithTimeout(this.invidiousHostsUrl, {
        timeout: 3_000,
      });
      const data = await response.json();

      this.baseApiUrls = data
        .filter((host: Array<Record<string, unknown>>) => {
          const info = host[1];
          const monitor = info['monitor'] as Record<string, unknown>;
          const stats = info['stats'] as Record<string, unknown>;
          if (!stats) return false;
          const statsUsage = stats['usage'] as Record<string, unknown>;
          const statsUsageUsers = statsUsage['users'] as Record<
            string,
            unknown
          >;

          return (
            info['api'] &&
            // info['cors'] &&
            info['type'] === 'https' &&
            !monitor['down'] &&
            monitor['up_since'] &&
            monitor['enabled'] &&
            monitor['published'] &&
            // stats['openRegistrations'] &&
            (statsUsageUsers['total'] as number) > 1_000
          );
        })
        .map((host: Array<Record<string, unknown>>) => host[1]['uri']);

      this.baseVideoUrls = data
        .filter((host: Array<Record<string, unknown>>) => {
          const info = host[1];
          const monitor = info['monitor'] as Record<string, unknown>;
          const stats = info['stats'] as Record<string, unknown>;
          if (!stats) return false;
          const statsUsage = stats['usage'] as Record<string, unknown>;
          const statsUsageUsers = statsUsage['users'] as Record<
            string,
            unknown
          >;

          return (
            // info['api'] &&
            // info['cors'] &&
            info['type'] === 'https' &&
            !monitor['down'] &&
            monitor['up_since'] &&
            monitor['enabled'] &&
            monitor['published'] &&
            // stats['openRegistrations'] &&
            (statsUsageUsers['total'] as number) > 1_000
          );
        })
        .map((host: Array<Record<string, unknown>>) => host[1]['uri']);
    } catch (error) {
      console.log(error);
    }
  }
}
