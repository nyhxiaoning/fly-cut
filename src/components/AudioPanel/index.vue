<template>
  <div class="p-4 flex-1 overflow-hidden flex flex-col">
    <AssetList type="audio" upload-text="本地音频" @upload="onUpload" @add-track="addToTrack" />
  </div>
</template>

<script setup lang="ts">
  import { usePlayerState } from '@/stores/playerState';
  import { useTrackState } from '@/stores/trackState';
  import { useResourceStore } from '@/stores/resourceStore';
  import { ElMessage } from 'element-plus';
  import { selectFile } from '@/utils/file';
  import { getMD5 } from '@/class/Base';
  import { AudioTrack } from '@/class/AudioTrack';
  import { audioDecoder } from '@/utils/webcodecs';
  import type { ResourceItem } from '@/stores/resourceStore';

  const trackStore = useTrackState();
  const playStore = usePlayerState();
  const resourceStore = useResourceStore();

  async function onUpload() {
    const files = await selectFile({ accept: 'audio/*', multiple: false });

    const id = await getMD5(await files[0].arrayBuffer());

    const clip = await audioDecoder.decode({ id, stream: files[0].stream(), type: files[0].type });

    if (!clip) {
      ElMessage.error('解析音频失败');
      return;
    }

    const url = URL.createObjectURL(files[0]);

    resourceStore.addResource({
      id,
      name: files[0].name,
      type: 'audio',
      format: files[0].type,
      fileSize: files[0].size,
      url,
      duration: Math.round(clip.meta.duration / 1e6),
      createdAt: Date.now()
    });

    ElMessage.success('音频上传成功');
  }

  function addToTrack(resource: ResourceItem) {
    const audioTrack = new AudioTrack({
      id: resource.id,
      url: resource.url,
      name: resource.name,
      format: resource.format,
      duration: resource.duration || 0
    }, playStore.playStartFrame);

    trackStore.addTrack(audioTrack);
  }
</script>
