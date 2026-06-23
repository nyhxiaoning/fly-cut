<template>
  <div class="p-4 flex-1 overflow-hidden flex flex-col">
    <AssetList type="image" upload-text="本地图片" @upload="onUpload" @add-track="addToTrack" />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus';
  import { useTrackState } from '@/stores/trackState';
  import { usePlayerState } from '@/stores/playerState';
  import { useResourceStore } from '@/stores/resourceStore';
  import { imageDecoder } from '@/utils/webcodecs';
  import { selectFile, getFileSize } from '@/utils/file';
  import { getMD5 } from '@/class/Base';
  import type { ImageSource } from '@/class/ImageTrack';
  import { ImageTrack } from '@/class/ImageTrack';
  import type { ResourceItem } from '@/stores/resourceStore';

  const trackStore = useTrackState();
  const playStore = usePlayerState();
  const resourceStore = useResourceStore();

  async function generateThumbnail(frame: VideoFrame, maxSize = 120): Promise<string> {
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

  async function onUpload() {
    const files = await selectFile({ accept: 'image/*', multiple: false });

    const id = await getMD5(await files[0].arrayBuffer());
    const frames = await imageDecoder.decode({ id, stream: files[0].stream(), type: files[0].type });

    if (!frames) {
      ElMessage.error('解析图片失败');
      return;
    }

    // Generate thumbnail
    let thumbnail: string | undefined;
    try {
      thumbnail = await generateThumbnail(frames[0]);
    } catch {
      // Thumbnail generation is non-critical
    }

    // Create blob URL from the original file
    const url = URL.createObjectURL(files[0]);

    resourceStore.addResource({
      id,
      name: files[0].name,
      type: 'image',
      format: files[0].type,
      fileSize: files[0].size,
      url,
      thumbnail,
      width: frames[0].codedWidth,
      height: frames[0].codedHeight,
      createdAt: Date.now()
    });

    ElMessage.success('图片上传成功');
  }

  function addToTrack(resource: ResourceItem) {
    const imageSource: ImageSource = {
      id: resource.id,
      url: resource.id,
      name: resource.name,
      format: resource.format,
      width: resource.width || 0,
      height: resource.height || 0
    };

    const imageTrack = new ImageTrack(imageSource, playStore.playStartFrame);
    imageTrack.resize({ width: playStore.playerWidth, height: playStore.playerHeight });
    trackStore.addTrack(imageTrack);
  }
</script>
