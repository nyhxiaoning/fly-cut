<template>
  <div class="p-4 flex-1 overflow-hidden flex flex-col">
    <AssetList type="all" upload-text="上传素材" @upload="onUpload" @add-track="addToTrack" />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus';
  import { useTrackState } from '@/stores/trackState';
  import { usePlayerState } from '@/stores/playerState';
  import { useResourceStore } from '@/stores/resourceStore';
  import { imageDecoder, videoDecoder, audioDecoder } from '@/utils/webcodecs';
  import { selectFile } from '@/utils/file';
  import { getMD5 } from '@/class/Base';
  import { ImageTrack } from '@/class/ImageTrack';
  import { VideoTrack } from '@/class/VideoTrack';
  import { AudioTrack } from '@/class/AudioTrack';
  import type { ResourceItem } from '@/stores/resourceStore';
  import type { ImageSource } from '@/class/ImageTrack';

  const trackStore = useTrackState();
  const playStore = usePlayerState();
  const resourceStore = useResourceStore();

  async function generateThumbnailFromFrame(frame: VideoFrame, maxSize = 120): Promise<string> {
    const canvas = document.createElement('canvas');
    let w = frame.codedWidth;
    let h = frame.codedHeight;
    if (w > h) {
      if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
    } else if (h > maxSize) {
      w = Math.round(w * maxSize / h); h = maxSize;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.drawImage(frame, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  }

  async function generateVideoThumbnail(clip: Awaited<ReturnType<typeof videoDecoder.decode>>): Promise<string | undefined> {
    if (!clip) return undefined;
    try {
      const frame = await clip.tick(1e6);
      if (!frame.video) return undefined;
      const result = await generateThumbnailFromFrame(frame.video);
      frame.video.close();
      return result;
    } catch {
      return undefined;
    }
  }

  async function handleFile(file: File) {
    const id = await getMD5(await file.arrayBuffer());

    if (file.type.startsWith('image/')) {
      const frames = await imageDecoder.decode({ id, stream: file.stream(), type: file.type });
      if (!frames) {
        ElMessage.error(`解析图片失败: ${file.name}`);
        return;
      }
      let thumbnail: string | undefined;
      try {
        thumbnail = await generateThumbnailFromFrame(frames[0]);
      } catch { /* non-critical */ }
      const url = URL.createObjectURL(file);
      resourceStore.addResource({
        id, name: file.name, type: 'image', format: file.type,
        fileSize: file.size, url, thumbnail,
        width: frames[0].codedWidth, height: frames[0].codedHeight,
        createdAt: Date.now()
      });
    } else if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm)$/i)) {
      const clip = await videoDecoder.decode({ id, stream: file.stream(), type: file.type });
      if (!clip) {
        ElMessage.error(`解析视频失败: ${file.name}`);
        return;
      }
      const thumbnail = await generateVideoThumbnail(clip);
      const url = URL.createObjectURL(file);
      resourceStore.addResource({
        id, name: file.name, type: 'video', format: file.type,
        fileSize: file.size, url, thumbnail,
        width: clip.meta.width, height: clip.meta.height,
        duration: Math.round(clip.meta.duration / 1e6),
        createdAt: Date.now()
      });
    } else if (file.type.startsWith('audio/')) {
      const clip = await audioDecoder.decode({ id, stream: file.stream(), type: file.type });
      if (!clip) {
        ElMessage.error(`解析音频失败: ${file.name}`);
        return;
      }
      const url = URL.createObjectURL(file);
      resourceStore.addResource({
        id, name: file.name, type: 'audio', format: file.type,
        fileSize: file.size, url,
        duration: Math.round(clip.meta.duration / 1e6),
        createdAt: Date.now()
      });
    }
  }

  async function onUpload() {
    const files = await selectFile({ accept: 'image/*,audio/*,.mp4,.mov,.webm', multiple: true });
    await Promise.all(files.map(file => handleFile(file).catch(() => {
      ElMessage.error(`处理文件失败: ${file.name}`);
    })));
    ElMessage.success('素材上传完成');
  }

  function addToTrack(resource: ResourceItem) {
    switch (resource.type) {
      case 'image': {
        const imageSource: ImageSource = {
          id: resource.id, url: resource.id, name: resource.name,
          format: resource.format, width: resource.width || 0, height: resource.height || 0
        };
        const track = new ImageTrack(imageSource, playStore.playStartFrame);
        track.resize({ width: playStore.playerWidth, height: playStore.playerHeight });
        trackStore.addTrack(track);
        break;
      }
      case 'video': {
        const track = new VideoTrack({
          id: resource.id, url: resource.url, name: resource.name,
          format: resource.format, width: resource.width || 0,
          height: resource.height || 0, duration: resource.duration || 0
        }, playStore.playStartFrame);
        track.resize({ width: playStore.playerWidth, height: playStore.playerHeight });
        trackStore.addTrack(track);
        break;
      }
      case 'audio': {
        const track = new AudioTrack({
          id: resource.id, url: resource.url, name: resource.name,
          format: resource.format, duration: resource.duration || 0
        }, playStore.playStartFrame);
        trackStore.addTrack(track);
        break;
      }
      default:
        break;
    }
  }
</script>
