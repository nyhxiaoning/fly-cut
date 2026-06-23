<template>
  <el-dialog
    v-model="dialogVisible"
    title="导出设置"
    width="520px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    class="export-dialog"
  >
    <el-form label-width="100px" label-position="left" size="small">
      <!-- 输出设置 -->
      <div class="export-section mb-4">
        <div class="text-sm font-semibold text-gray-700 mb-2">输出设置</div>
        <el-form-item label="分辨率">
          <el-select v-model="resolutionIndex" class="w-full">
            <el-option
              v-for="(preset, idx) in RESOLUTION_PRESETS"
              :key="idx"
              :label="preset.label"
              :value="idx"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="编码格式">
          <el-select v-model="codecIndex" class="w-full">
            <el-option
              v-for="(codec, idx) in CODEC_OPTIONS"
              :key="idx"
              :label="codec.label"
              :value="idx"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="比特率">
          <el-slider
            v-model="options.bitrate"
            :min="1_000_000"
            :max="20_000_000"
            :step="1_000_000"
            :format-tooltip="(val: number) => `${(val / 1_000_000).toFixed(0)} Mbps`"
            class="w-full"
          />
          <div class="text-xs text-gray-400 mt-1">{{ (options.bitrate / 1_000_000).toFixed(0) }} Mbps</div>
        </el-form-item>
        <el-form-item label="帧率">
          <el-select v-model="options.fps" class="w-28">
            <el-option label="24 fps" :value="24" />
            <el-option label="30 fps" :value="30" />
            <el-option label="60 fps" :value="60" />
          </el-select>
        </el-form-item>
      </div>

      <!-- 轨道选项 -->
      <div class="export-section mb-4">
        <div class="text-sm font-semibold text-gray-700 mb-2">轨道选项</div>
        <el-checkbox v-model="options.includeVideo" label="多轨视频" border class="mr-2 mb-2" />
        <el-checkbox v-model="options.includeAudio" label="多轨音频" border class="mr-2 mb-2" />
        <el-checkbox v-model="options.includeSubtitles" label="字幕" border class="mr-2 mb-2" />
        <el-checkbox v-model="options.includeAnimation" label="动画" border class="mb-2" />
      </div>

      <!-- 高级设置 -->
      <div class="export-section">
        <div class="text-sm font-semibold text-gray-700 mb-2">高级设置</div>
        <el-checkbox v-model="options.gpuAcceleration" label="GPU 加速" border class="mr-2 mb-2" />
        <el-checkbox v-model="options.useWorker" label="Worker 导出" border class="mb-2" disabled />
        <div v-if="options.useWorker" class="text-xs text-gray-400 ml-1">Worker 模式将在后台导出，不阻塞 UI</div>
      </div>
    </el-form>

    <!-- 进度 -->
    <div v-if="exporting" class="mt-4">
      <el-progress :percentage="exportProgress" :stroke-width="12" status="success" />
      <div class="text-xs text-center text-gray-400 mt-1">
        {{ progressText }}
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose" :disabled="exporting">取消</el-button>
      <el-button type="primary" @click="handleExport" :loading="exporting">
        {{ exporting ? '导出中...' : '开始导出' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue';
  import { ElMessage } from 'element-plus';
  import {
    startExport,
    RESOLUTION_PRESETS,
    CODEC_OPTIONS,
    DEFAULT_EXPORT_OPTIONS,
    type ExportOptions
  } from '@/utils/export';

  const props = defineProps<{
    visible: boolean
  }>();
  const emit = defineEmits<{
    'update:visible': [value: boolean]
  }>();

  const dialogVisible = computed({
    get: () => props.visible,
    set: (val: boolean) => emit('update:visible', val)
  });

  const resolutionIndex = ref(0);
  const codecIndex = ref(0);
  const exporting = ref(false);
  const exportProgress = ref(0);
  const progressText = ref('');

  const options = ref<ExportOptions>({
    ...DEFAULT_EXPORT_OPTIONS
  });

  // 同步分辨率选择
  watch(resolutionIndex, idx => {
    const preset = RESOLUTION_PRESETS[idx];
    options.value.width = preset.width;
    options.value.height = preset.height;
  });

  // 同步编码格式选择
  watch(codecIndex, idx => {
    const codec = CODEC_OPTIONS[idx];
    options.value.videoCodec = codec.value;
  });

  function handleClose() {
    if (exporting.value) return;
    dialogVisible.value = false;
  }

  async function handleExport() {
    if (exporting.value) return;

    const isExporting = true;
    exporting.value = isExporting;
    exportProgress.value = 0;
    progressText.value = '正在合成视频...';

    try {
      await startExport(options.value, (progress: number) => {
        exportProgress.value = progress;
        if (progress > 0 && progress < 100) {
          progressText.value = `合成中 ${progress}%`;
        } else if (progress >= 100) {
          progressText.value = '正在写入文件...';
        }
      });

      exportProgress.value = 100;
      progressText.value = '导出完成';
      ElMessage.success('视频导出成功');
      dialogVisible.value = false;
    } catch (e) {
      console.error('导出失败:', e);
      ElMessage.error(`导出失败: ${(e as Error).message || '未知错误'}`);
    } finally {
      // eslint-disable-next-line require-atomic-updates
      exporting.value = false;
      exportProgress.value = 0;
      progressText.value = '';
    }
  }
</script>

<style scoped>
  .export-dialog :deep(.el-dialog__body) {
    padding-top: 12px;
    padding-bottom: 4px;
  }

  .export-section {
    background: #f9fafb;
    border-radius: 8px;
    padding: 12px;
  }

  :deep(.dark) .export-section {
    background: #1f2937;
  }

  :deep(.dark) .text-gray-700 {
    color: #d1d5db;
  }
</style>
