import { createStorage, StorageEnum } from '../base/index.js';
import type { BaseStorageType } from '../base/types.js';

// Type for the mapping - using Record instead of Map for JSON serialization
type WindowCabinetMapping = Record<number, string>; // windowId -> cabinetId

type WindowCabinetMappingStorageType = BaseStorageType<WindowCabinetMapping> & {
  setMapping: (windowId: number, cabinetId: string) => Promise<void>;
  getMapping: (windowId: number) => Promise<string | null>;
  removeMapping: (windowId: number) => Promise<void>;
  getAllMappings: () => Promise<WindowCabinetMapping>;
  clearAllMappings: () => Promise<void>;
};

const storage = createStorage<WindowCabinetMapping>(
  'window-cabinet-mapping-key',
  {},
  {
    storageEnum: StorageEnum.Session,
    liveUpdate: true,
  },
);

export const windowCabinetMappingStorage: WindowCabinetMappingStorageType = {
  ...storage,

  async setMapping(windowId: number, cabinetId: string): Promise<void> {
    await storage.set(currentMappings => ({
      ...currentMappings,
      [windowId]: cabinetId,
    }));
  },

  async getMapping(windowId: number): Promise<string | null> {
    const mappings = await storage.get();
    return mappings[windowId] || null;
  },

  async removeMapping(windowId: number): Promise<void> {
    await storage.set(currentMappings => {
      const updated = { ...currentMappings };
      delete updated[windowId];
      return updated;
    });
  },

  async getAllMappings(): Promise<WindowCabinetMapping> {
    return await storage.get();
  },

  async clearAllMappings(): Promise<void> {
    await storage.set(() => ({}));
  },
};
