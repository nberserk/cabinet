import { createStorage, StorageEnum } from '../base/index.js';
import type { Cabinet } from '../../../shared/lib/types/cabinet.js';
import type { BaseStorageType } from '../base/types.js';

type CabinetStorageType = BaseStorageType<Cabinet[]> & {
  addCabinet: (cabinet: Cabinet) => Promise<void>;
  removeCabinet: (cabinetId: string) => Promise<void>;
  updateCabinet: (cabinetId: string, updates: Partial<Cabinet>) => Promise<void>;
  getCabinet: (cabinetId: string) => Promise<Cabinet | null>;
  getAllCabinets: () => Promise<Cabinet[]>;
  searchCabinets: (query: string) => Promise<Cabinet[]>;
};

const storage = createStorage<Cabinet[]>('cabinet-collection-key', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const cabinetStorage: CabinetStorageType = {
  ...storage,

  async addCabinet(cabinet: Cabinet): Promise<void> {
    const cabinets = await storage.get();
    const existingIndex = cabinets.findIndex(c => c.id === cabinet.id);

    if (existingIndex >= 0) {
      // Update existing cabinet
      cabinets[existingIndex] = { ...cabinet, updatedAt: Date.now() };
    } else {
      // Add new cabinet
      cabinets.push(cabinet);
    }

    await storage.set(cabinets);
  },

  async removeCabinet(cabinetId: string): Promise<void> {
    const cabinets = await storage.get();
    const updatedCabinets = cabinets.filter(c => c.id !== cabinetId);
    await storage.set(updatedCabinets);
  },

  async updateCabinet(cabinetId: string, updates: Partial<Cabinet>): Promise<void> {
    const cabinets = await storage.get();
    const cabinetIndex = cabinets.findIndex(c => c.id === cabinetId);

    if (cabinetIndex >= 0) {
      cabinets[cabinetIndex] = {
        ...cabinets[cabinetIndex],
        ...updates,
        updatedAt: Date.now(),
      };
      await storage.set(cabinets);
    }
  },

  async getCabinet(cabinetId: string): Promise<Cabinet | null> {
    const cabinets = await storage.get();
    return cabinets.find(c => c.id === cabinetId) || null;
  },

  async getAllCabinets(): Promise<Cabinet[]> {
    const cabinets = await storage.get();
    return cabinets.sort((a, b) => b.createdAt - a.createdAt);
  },

  async searchCabinets(query: string): Promise<Cabinet[]> {
    const cabinets = await storage.get();
    const lowercaseQuery = query.toLowerCase();

    return cabinets
      .filter(
        cabinet =>
          cabinet.name.toLowerCase().includes(lowercaseQuery) ||
          cabinet.description?.toLowerCase().includes(lowercaseQuery) ||
          cabinet.tags?.some((tag: string) => tag.toLowerCase().includes(lowercaseQuery)) ||
          cabinet.tabs.some(
            tab => tab.title.toLowerCase().includes(lowercaseQuery) || tab.url.toLowerCase().includes(lowercaseQuery),
          ),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  },
};
