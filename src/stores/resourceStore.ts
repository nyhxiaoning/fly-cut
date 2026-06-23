import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { file as opfsFile } from 'opfs-tools';

export interface ResourceItem {
  id: string
  name: string
  type: 'image' | 'video' | 'audio'
  format: string
  fileSize: number
  url: string
  thumbnail?: string
  duration?: number
  width?: number
  height?: number
  createdAt: number
}

type ResourceMeta = Omit<ResourceItem, 'url'>;

const STORAGE_KEY = 'fly-cut-resources';

export const useResourceStore = defineStore('resourceStore', () => {
  const resourceList = ref<ResourceItem[]>([]);

  async function init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const rawMetas = JSON.parse(stored);
      if (!Array.isArray(rawMetas)) {
        console.warn('Invalid resources data in localStorage');
        return;
      }
      const metas: ResourceMeta[] = rawMetas;
      const items: ResourceItem[] = [];
      const restorePromises = metas.map(async meta => {
        if (!meta || !meta.id) {
          console.warn('Skip invalid resource meta:', meta);
          return null;
        }
        try {
          const opfsFileHandle = opfsFile(meta.id);
          const exists = await opfsFileHandle.exists();
          if (!exists) {
            console.warn('OPFS file not found for resource:', meta.id);
            return null;
          }
          const stream = await opfsFileHandle.stream();
          const blob = await new Response(stream).blob();
          const url = URL.createObjectURL(blob);
          return { ...meta, url };
        } catch (e) {
          console.warn('Failed to restore resource:', meta.id, e);
          return null;
        }
      });
      const results = await Promise.all(restorePromises);
      results.forEach(r => { if (r) items.push(r); });

      resourceList.value = items;
    } catch (e) {
      console.warn('Failed to init resources from localStorage:', e);
    }
  }

  function saveToStorage() {
    try {
      const data: ResourceMeta[] = resourceList.value
        .filter(r => r.id)
        .map(({ url, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save resources to localStorage:', e);
    }
  }

  function addResource(item: ResourceItem) {
    resourceList.value.push(item);
    saveToStorage();
  }

  async function removeResource(id: string) {
    if (!id) {
      console.warn('removeResource called with empty id');
      return;
    }
    resourceList.value = resourceList.value.filter(r => r.id !== id);
    saveToStorage();
    // Also remove from OPFS — check existence first
    try {
      const handle = opfsFile(id);
      if (await handle.exists()) {
        await handle.remove();
      }
    } catch (e) {
      console.warn('OPFS file removal failed (non-critical):', e);
    }
  }

  function renameResource(id: string, newName: string) {
    const item = resourceList.value.find(r => r.id === id);
    if (item) {
      item.name = newName;
      saveToStorage();
    }
  }

  function getResourceById(id: string) {
    return resourceList.value.find(r => r.id === id);
  }

  const getResourcesByType = computed(() => (type: ResourceItem['type']) => {
    return resourceList.value.filter(r => r.type === type);
  });

  // Auto-init on first store access
  init();

  return {
    resourceList,
    init,
    addResource,
    removeResource,
    renameResource,
    getResourceById,
    getResourcesByType
  };
});
