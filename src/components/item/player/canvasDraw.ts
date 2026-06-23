import { usePlayerState } from '@/stores/playerState';
import { useTrackState } from '@/stores/trackState';
import { watch, reactive, onMounted } from 'vue';
import type { Ref } from 'vue';

export class CanvasPlayer {
  player: Ref<HTMLCanvasElement | null>;
  playerContext: ImageBitmapRenderingContext | null = null;
  playerStore: ReturnType<typeof usePlayerState>;
  trackState: ReturnType<typeof useTrackState>;
  containerSize: Record<string, unknown>;
  canvasSize = reactive({
    width: 0,
    height: 0
  });

  constructor(options: { player: Ref<HTMLCanvasElement | null>; containerSize: Record<string, unknown> }) {
    this.player = options.player;
    this.containerSize = options.containerSize;
    this.playerStore = usePlayerState();
    this.trackState = useTrackState();

    // DOM 挂载后初始化播放器上下文
    onMounted(() => {
      if (this.player.value) {
        this.playerContext = this.player.value.getContext('bitmaprenderer');
      }
      // 初始化后立即绘制一帧
      this.drawCanvas();
    });

    this.initWatch();
  }

  initWatch() {
    watch(
      [
        () => this.trackState.trackList,
        () => this.canvasSize,
        () => this.playerStore.playStartFrame
      ],
      () => this.drawCanvas(),
      { deep: true }
    );
  }

  async drawCanvas() {
    if (this.playerStore.ingLoadingCount !== 0) return;

    // playerContext 可能在 onMounted 后才可用
    if (!this.playerContext) {
      if (this.player.value) {
        this.playerContext = this.player.value.getContext('bitmaprenderer');
      }
      if (!this.playerContext) return;
    }

    const playerW = this.playerStore.playerWidth || 180;
    const playerH = this.playerStore.playerHeight || 320;
    // @ts-expect-error OffscreenCanvas may not be in type lib
    const offCanvas = new OffscreenCanvas(playerW, playerH);
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;

    const playFrame = this.playerStore.playStartFrame;

    // 填充默认背景色
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, playerW, playerH);

    // 收集当前帧需要绘制的非音频轨道
    const drawTasks: Array<() => Promise<boolean>> = [];

    for (const { list } of this.trackState.trackList) {
      const trackItem = list.find((item: Record<string, unknown>) => {
        const start = item.start as number;
        const end = item.end as number;
        return playFrame >= start && playFrame <= end && item.type !== 'audio';
      });

      if (trackItem) {
        // unshift 以保证底层轨道先绘制
        drawTasks.unshift(() => this.drawToRenderCanvas(ctx, trackItem, playFrame));
      }
    }

    // 顺序绘制所有轨道
    const drawResults = drawTasks.map(task => task().catch(e => {
      console.warn('Render task failed:', e);
    }));
    await Promise.all(drawResults);

    // 渲染到播放器
    try {
      const bitmap = offCanvas.transferToImageBitmap();
      this.playerContext.transferFromImageBitmap(bitmap);
    } catch (e) {
      console.warn('Failed to render frame to player:', e);
    }
  }

  async drawToRenderCanvas(
    ctx: OffscreenCanvasRenderingContext2D,
    trackItem: Record<string, unknown>,
    frameIndex: number
  ): Promise<boolean> {
    try {
      const rawTrack = toRaw(trackItem);
      if (typeof rawTrack.draw === 'function') {
        await rawTrack.draw(ctx, {
          width: this.playerStore.playerWidth,
          height: this.playerStore.playerHeight
        }, frameIndex);
      }
      return true;
    } catch (e) {
      console.warn(`Failed to draw "${String(trackItem.name || 'unknown')}":`, e);
      return false;
    }
  }
}
