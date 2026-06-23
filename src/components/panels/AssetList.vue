<template>
  <div class="flex-1 overflow-hidden flex flex-col">
    <!-- Upload button -->
    <div class="bg-zinc-200 h-10 flex items-center justify-center rounded text-sm text-gray-900 cursor-pointer" @click="$emit('upload')">
      <i class="iconfont icon-shangchuan_line mr-2" />
      {{ uploadText }}
    </div>
    <!-- Asset list -->
    <div class="flex-1 overflow-y-auto mt-2 space-y-1">
      <div v-if="filteredList.length === 0" class="text-center text-gray-400 text-sm mt-8">
        暂无上传素材
      </div>
      <div
        v-for="resource in filteredList"
        :key="resource.id"
        class="flex items-center p-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-pointer"
        @click="handleAddTrack(resource)"
      >
        <!-- Thumbnail / Icon -->
        <div class="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-zinc-200 flex items-center justify-center">
          <img v-if="resource.thumbnail" :src="resource.thumbnail" class="w-full h-full object-cover">
          <i v-else class="iconfont text-lg text-gray-400" :class="typeIcon" />
        </div>
        <!-- Info -->
        <div class="ml-2 flex-1 min-w-0">
          <div class="text-sm truncate">{{ resource.name }}</div>
          <div class="text-xs text-gray-400">
            {{ getFileSize(resource.fileSize) }}
            <template v-if="resource.duration"> - {{ formatDuration(resource.duration) }}</template>
          </div>
        </div>
        <!-- Actions (always visible) -->
        <div class="flex items-center gap-0.5 ml-2" @click.stop>
          <!-- 添加到轨道 -->
          <div
            class="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50"
            @click="handleAddTrack(resource)"
          >
            <i class="iconfont icon-tianjia_line text-sm" />
          </div>
          <!-- 重命名 -->
          <div
            class="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            @click="handleRename(resource)"
          >
            <i class="iconfont icon-bianji_line text-sm" />
          </div>
          <!-- 删除 -->
          <div
            class="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
            @click="handleDelete(resource)"
          >
            <i class="iconfont icon-shanchu_line text-sm" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { ElMessageBox, ElMessage } from 'element-plus';
  import { useResourceStore, type ResourceItem } from '@/stores/resourceStore';
  import { getFileSize } from '@/utils/file';

  const props = defineProps<{
    type: 'image' | 'video' | 'audio' | 'all'
    uploadText?: string
  }>();

  const emit = defineEmits<{
    upload: []
    addTrack: [resource: ResourceItem]
  }>();

  const resourceStore = useResourceStore();

  const filteredList = computed(() => {
    if (props.type === 'all') return resourceStore.resourceList;
    return resourceStore.resourceList.filter(r => r.type === props.type);
  });

  const typeIcon = computed(() => {
    switch (props.type) {
      case 'image': return 'icon-tupian_line';
      case 'video': return 'icon-shipin_line';
      case 'audio': return 'icon-yinle_line';
      default: return 'icon-wenjian_line';
    }
  });

  function handleAddTrack(resource: ResourceItem) {
    emit('addTrack', resource);
  }

  async function handleRename(resource: ResourceItem) {
    try {
      const { value } = await ElMessageBox.prompt('请输入新的名称', '重命名', {
        inputValue: resource.name,
        inputPlaceholder: '素材名称',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        closeOnClickModal: false,
        customClass: 'rename-resource-dialog'
      });
      if (value && value.trim() && value.trim() !== resource.name) {
        resourceStore.renameResource(resource.id, value.trim());
        ElMessage.success('重命名成功');
      }
    } catch {
      // user cancelled
    }
  }

  async function handleDelete(resource: ResourceItem) {
    try {
      await ElMessageBox.confirm(`确定要删除「${resource.name}」吗？`, '删除素材', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });
      await resourceStore.removeResource(resource.id);
      ElMessage.success('删除成功');
    } catch (e) {
      if (e === 'cancel' || e === 'close') {
        // user cancelled
        return;
      }
      if ((e as Error)?.message?.includes('cancel')) {
        // ElMessageBox rejection on cancel
        return;
      }
      ElMessage.error('删除失败');
      console.error('删除素材失败:', e);
    }
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
</script>
