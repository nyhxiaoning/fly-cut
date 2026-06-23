import { toRaw } from 'vue';
import { Combinator, OffscreenSprite, EmbedSubtitlesClip } from '@webav/av-cliper';
import { useTrackState } from '@/stores/trackState';
import { usePlayerState } from '@/stores/playerState';
import { AudioTrack } from '@/class/AudioTrack';
import { TextTrack } from '@/class/TextTrack';
import { VideoTrack } from '@/class/VideoTrack';
import { ImageTrack } from '@/class/ImageTrack';
import type { Track as TrackType } from '@/class/Track';
import { createFileWriter } from '@/utils/common';

export interface ExportOptions {
  width: number
  height: number
  bitrate: number
  fps: number
  videoCodec: string
  bgColor: string
  includeVideo: boolean
  includeAudio: boolean
  includeSubtitles: boolean
  includeAnimation: boolean
  gpuAcceleration: boolean
  useWorker: boolean
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  width: 1080,
  height: 1920,
  bitrate: 5_000_000,
  fps: 30,
  videoCodec: 'avc1.42E032',
  bgColor: 'black',
  includeVideo: true,
  includeAudio: true,
  includeSubtitles: true,
  includeAnimation: true,
  gpuAcceleration: false,
  useWorker: false
};

export const RESOLUTION_PRESETS = [
  { label: '1080×1920 (竖屏)', width: 1080, height: 1920 },
  { label: '1920×1080 (横屏)', width: 1920, height: 1080 },
  { label: '720×1280 (竖屏)', width: 720, height: 1280 },
  { label: '1280×720 (横屏)', width: 1280, height: 720 },
  { label: '540×960 (竖屏)', width: 540, height: 960 },
  { label: '960×540 (横屏)', width: 960, height: 540 }
] as const;

export const CODEC_OPTIONS = [
  { label: 'H.264 (AVC)', value: 'avc1.42E032', format: 'mp4' },
  { label: 'H.265 (HEVC)', value: 'hev1.1.6.L120.90', format: 'mp4' },
  { label: 'VP9', value: 'vp09.00.10.08', format: 'webm' },
  { label: 'AV1', value: 'av01.0.04M.08', format: 'mp4' }
] as const;

/**
 * 将 TextTrack 转为字幕数据结构
 */
function textTracksToSubtitles(textTracks: TextTrack[]) {
  const usPerFrame = 1e6 / 30;
  return textTracks.map(t => ({
    start: t.start * usPerFrame,
    end: t.end * usPerFrame,
    text: t.content || ''
  }));
}

async function createSpriteForTrack(
  track: TrackType,
  playerWidth: number,
  playerHeight: number,
  outputRatio: number
): Promise<OffscreenSprite | null> {
  try {
    const raw = toRaw(track);
    if (track instanceof AudioTrack) {
      return await (raw as AudioTrack).combine();
    }
    return await (raw as VideoTrack | ImageTrack).combine(
      { width: playerWidth, height: playerHeight },
      outputRatio
    ) as OffscreenSprite;
  } catch (e) {
    console.warn(`创建轨道 "${track.name}" 精灵失败:`, e);
    return null;
  }
}

function addSubtitles(
  sprites: OffscreenSprite[],
  allTracks: TrackType[],
  options: ExportOptions
): OffscreenSprite[] {
  const textTracks = allTracks.filter((t): t is TextTrack => t instanceof TextTrack);
  if (textTracks.length === 0) return sprites;

  try {
    const subData = textTracksToSubtitles(textTracks);
    if (subData.length === 0) return sprites;

    const subClip = new EmbedSubtitlesClip(subData, {
      videoWidth: options.width,
      videoHeight: options.height,
      fontSize: Math.round(24 * (options.width / 1080)),
      fontFamily: 'sans-serif',
      color: 'white',
      strokeStyle: 'black',
      lineWidth: 2,
      bottomOffset: Math.round(40 * (options.height / 1920))
    });
    const subSpr = new OffscreenSprite(subClip);
    subSpr.zIndex = 9999;
    sprites.push(subSpr);
  } catch (e) {
    console.warn('创建字幕失败:', e);
  }

  return sprites;
}

/**
 * 执行视频导出
 *
 * 与原始 HeaderContainer.vue 的 onGenerate 保持完全一致的核心逻辑：
 * 1. 使用 toRaw(track).combine() —— 直接复用解码器缓存的 clip
 * 2. Combinator 只设置 width/height/bgColor
 * 3. Promise.all 并发添加所有 sprite，zIndex = 999 - index
 * 4. 只在此之上叠加可选的字幕精灵
 */
export async function startExport(
  options: ExportOptions,
  onProgress?: (progress: number) => void
): Promise<void> {
  const ts = useTrackState();
  const ps = usePlayerState();

  // ---- 合并所有轨道 ----
  const allTracks: TrackType[] = [];
  for (const { list } of ts.trackList) {
    for (const item of list) {
      allTracks.push(item as TrackType);
    }
  }
  if (allTracks.length === 0) throw new Error('没有可导出的轨道');

  const outputRatio = options.width / (ps.playerWidth || 180);

  // ---- 创建 Combinator（与原始代码完全一致） ----
  const com = new Combinator({
    width: options.width,
    height: options.height,
    bgColor: options.bgColor
  });

  if (onProgress) com.on('OutputProgress', (p: number) => onProgress(Math.round(p * 100)));

  try {
    // ---- 使用 track.combine() 创建所有精灵（与原始代码完全一致） ----
    const spritePromises: Promise<OffscreenSprite | null>[] = [];

    for (const track of allTracks) {
      const skip = (track instanceof AudioTrack && !options.includeAudio)
        || (track instanceof VideoTrack && !options.includeVideo)
        || (track instanceof ImageTrack && !options.includeVideo)
        || track instanceof TextTrack;
      if (!skip) {
        spritePromises.push(createSpriteForTrack(track, ps.playerWidth, ps.playerHeight, outputRatio));
      }
    }

    let sprites = (await Promise.all(spritePromises)).filter(Boolean) as OffscreenSprite[];

    // ---- 字幕 ----
    if (options.includeSubtitles) {
      sprites = addSubtitles(sprites, allTracks, options);
    }

    if (sprites.length === 0) throw new Error('没有可导出的轨道内容');

    // ---- 添加到 Combinator（与原始 onGenerate 完全一致） ----
    await Promise.all(sprites.map((s, i) => {
      s.zIndex = 999 - i;
      return com.addSprite(s);
    }));

    // ---- 输出 ----
    const ext = options.videoCodec.startsWith('vp') ? 'webm' : 'mp4';
    await com.output().pipeTo(
      (await createFileWriter(ext)) as unknown as WritableStream<Uint8Array>
    );
  } finally {
    com.destroy();
  }
}
