<template>
  <div class="p-4 flex-1 overflow-hidden flex flex-col">
    <AssetList type="video" upload-text="本地视频" @upload="onUpload" @add-track="addToTrack" />
  </div>
</template>

<script setup lang="ts">
  import { usePlayerState } from '@/stores/playerState';
  import { useTrackState } from '@/stores/trackState';
  import { useResourceStore } from '@/stores/resourceStore';
  import { videoDecoder } from '@/utils/webcodecs';
  import { ElMessage } from 'element-plus';
  import { selectFile } from '@/utils/file';
  import { getMD5 } from '@/class/Base';
  import { VideoTrack } from '@/class/VideoTrack';
  import type { ResourceItem } from '@/stores/resourceStore';

  const trackStore = useTrackState();
  const playStore = usePlayerState();
  const resourceStore = useResourceStore();

  async function generateThumbnailFromClip(clip: Awaited<ReturnType<typeof videoDecoder.decode>>): Promise<string | undefined> {
    if (!clip) return undefined;
    try {
      const frame = await clip.tick(1e6);
      if (!frame.video) return undefined;
      const canvas = document.createElement('canvas');
      let w = frame.video.codedWidth;
      let h = frame.video.codedHeight;
      const maxSize = 120;
      if (w > h) {
        if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
      } else {
        if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(frame.video, 0, 0, w, h);
      frame.video.close();
      return canvas.toDataURL('image/png');
    } catch {
      return undefined;
    }
  }

  async function onUpload() {
    const files = await selectFile({ accept: '.mp4,.mov,.webm', multiple: false });
    const id = await getMD5(await files[0].arrayBuffer());

    const clip = await videoDecoder.decode({ id, stream: files[0].stream(), type: files[0].type });

    if (!clip) {
      ElMessage.error('解析视频失败');
      return;
    }

    // Generate thumbnail
    const thumbnail = await generateThumbnailFromClip(clip);

    const url = URL.createObjectURL(files[0]);

    resourceStore.addResource({
      id,
      name: files[0].name,
      type: 'video',
      format: files[0].type,
      fileSize: files[0].size,
      url,
      thumbnail,
      width: clip.meta.width,
      height: clip.meta.height,
      duration: Math.round(clip.meta.duration / 1e6),
      createdAt: Date.now()
    });

    ElMessage.success('视频上传成功');
  }

  function addToTrack(resource: ResourceItem) {
    const videoTrack = new VideoTrack({
      id: resource.id,
      url: resource.url,
      name: resource.name,
      format: resource.format,
      width: resource.width || 0,
      height: resource.height || 0,
      duration: resource.duration || 0
    }, playStore.playStartFrame);

    videoTrack.resize({ width: playStore.playerWidth, height: playStore.playerHeight });
    trackStore.addTrack(videoTrack);
  }
</script>
