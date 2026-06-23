<template>
  <div
      ref="moveContainer"
      class="absolute left-0 right-0 top-0 bottom-0 m-auto"
  >
    <div
        v-for="(item, index) in targetList"
        :key="item.id"
        :data-eleId="item.id"
        :data-lineIndex="item.lineIndex"
        :data-itemIndex="item.itemIndex"
        :style="{
          zIndex: index,
          top: `${item.top}px`,
          left: `${item.left}px`,
          width: `${item.w}px`,
          height: `${item.h}px`,
          transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale})`
        }"
        class="move-target absolute"
        @click.stop="selectItem(item.id)"
        @mousedown="mousedown($event, item.id)"
    />
    <Moveable
        ref="moveable"
        v-bind="draggableOptions"
        @drag="onDrag"
        @scale="onScale"
        @resize-start="onResizeStart"
        @resize="onResize"
    />
  </div>
</template>

<script setup lang="ts">
  import { defaultMoveOptions } from '@/data/constant';
  import Moveable from 'vue3-moveable';
  import { computedItemShowArea, isVideo } from '@/utils/common';
  import { ref, nextTick, reactive, computed, watch } from 'vue';
  import { usePlayerState } from '@/stores/playerState';
  import { useTrackState } from '@/stores/trackState';
  import type { VideoTrack } from '@/class/VideoTrack';
  import type { TextTrack } from '@/class/TextTrack';
  import type { ImageTrack } from '@/class/ImageTrack';
  const props = defineProps({
    canvasSize: {
      type: Object,
      default() {
        return {
          width: 0,
          height: 0
        };
      }
    }
  });
  const store = usePlayerState();
  const trackStore = useTrackState();
  const moveContainer = ref();
  const moveable = ref();
  const moveTarget = ref();
  interface TargetItem {
    id: string;
    lineIndex: number,
    itemIndex: number,
    y: number;
    x: number;
    w: number;
    h: number;
    scale: number;
    left: number;
    top: number;
  }
  const targetList = computed(() => {
    if (store.playerHeight === 0 && store.playerWidth === 0) {
      return [];
    }

    const layerArr: TargetItem[] = [];

    trackStore.trackList.forEach(({ list }, lineIndex) => {
      const index = list.findIndex((item: Record<string, any>, itemIndex) => {
        if (store.playStartFrame >= item.start && store.playStartFrame <= item.end && item.draw) {
          return true;
        }
        return false;
      });
      const trackItem: VideoTrack | ImageTrack | TextTrack = list[index];
      if (trackItem) {
        layerArr.unshift({
          lineIndex,
          itemIndex: index,
          id: trackItem.id,
          scale: trackItem.scale / 100,
          x: trackItem.centerX,
          y: trackItem.centerY,
          w: trackItem.width,
          h: trackItem.height,
          left: store.playerWidth / 2 - trackItem.width / 2,
          top: store.playerHeight / 2 - trackItem.height / 2
        });
      }
    });
    moveable.value && moveable.value.updateRect();
    return layerArr;
  });
  const draggableOptions = reactive({
    target: moveTarget,
    className: 'cc-move',
    container: moveContainer.value,
    ...defaultMoveOptions
  });
  function selectItem(eleid: string) {
    console.log('🚀 ~ selectItem ~ eleid:', eleid);
    store.isPause = true;
    trackStore.selectTrackById(eleid);
  }
  function onDrag(params: Record<string, any>) {
    let { target, transform, translate } = params;
    const { lineindex, itemindex } = target.dataset;
    const [x, y] = translate;
    trackStore.trackList[lineindex].list[itemindex].centerX = x;
    trackStore.trackList[lineindex].list[itemindex].centerY = y;
    target.style.transform = transform;
  }
  interface ResizeStartState {
    startWidth: number
    startHeight: number
    startCenterX: number
    startCenterY: number
    direction: number[]
  }
  const resizeState = ref<ResizeStartState | null>(null);

  function onResizeStart(params: Record<string, any>) {
    const { target, direction } = params;
    const { lineindex, itemindex } = target.dataset;
    if (lineindex === undefined || itemindex === undefined) return;
    const item = trackStore.trackList[lineindex].list[itemindex];
    if (!item) return;
    resizeState.value = {
      startWidth: item.width,
      startHeight: item.height,
      startCenterX: item.centerX,
      startCenterY: item.centerY,
      direction
    };
  }

  function onResize(params: Record<string, any>) {
    const { target, width, height, direction, transform } = params;
    const { lineindex, itemindex } = target.dataset;
    const state = resizeState.value;
    if (!state || lineindex === undefined || itemindex === undefined) return;
    const item = trackStore.trackList[lineindex].list[itemindex];
    if (!item) return;

    const dirX = state.direction[0] || 0;
    const dirY = state.direction[1] || 0;
    const deltaW = width - state.startWidth;
    const deltaH = height - state.startHeight;

    item.width = Math.round(Math.max(width, 10));
    item.height = Math.round(Math.max(height, 10));
    item.centerX = Math.round(state.startCenterX + (dirX * deltaW) / 2);
    item.centerY = Math.round(state.startCenterY + (dirY * deltaH) / 2);

    target.style.width = `${item.width}px`;
    target.style.height = `${item.height}px`;
  }

  function onScale(params: Record<string, any>) {
    let { target, scale, transform } = params;
    const { lineindex, itemindex } = target.dataset;
    const newScale = Math.max(Math.round(scale[0] * 100), 1);
    trackStore.trackList[lineindex].list[itemindex].scale = newScale;
    target.style.transform = transform;
  }
  function mousedown(event: MouseEvent, eleid: string) {
    event.stopPropagation();
    store.isPause = true;
    trackStore.selectTrackById(eleid);
    moveTarget.value = event.currentTarget;
    nextTick(() => {
      moveable.value.dragStart(event);
    });
  }
  watch([trackStore.selectTrackItem, targetList], () => {
    if (moveContainer.value && trackStore.selectTrackItem.line !== -1 && trackStore.selectTrackItem.index !== -1) {
      const targetTrack = trackStore.trackList[trackStore.selectTrackItem.line].list[trackStore.selectTrackItem.index];
      if (targetTrack && targetList.value.find(item => item.id === targetTrack.id)) {
        moveTarget.value = moveContainer.value.querySelector(`.move-target[data-eleid='${targetTrack.id}']`);
      } else {
        moveTarget.value = null;
      }
    } else {
      moveTarget.value = null;
    }
  }, { immediate: true, flush: 'post' });
</script>

<style>
  body .cc-move .moveable-control{
    @apply border w-3 h-3 border-yellow-400 bg-gray-50 -ml-1.5 -mt-1.5;
  }
  body .cc-move .moveable-line{
    @apply bg-yellow-400 w-px;
  }
</style>