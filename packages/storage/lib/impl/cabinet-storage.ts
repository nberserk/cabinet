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
    await storage.set(currentCabinets => {
      const existingIndex = currentCabinets.findIndex(c => c.id === cabinet.id);

      if (existingIndex >= 0) {
        // Update existing cabinet
        const updated = [...currentCabinets];
        updated[existingIndex] = { ...cabinet, updatedAt: Date.now() };
        return updated;
      } else {
        // Add new cabinet
        return [...currentCabinets, cabinet];
      }
    });
  },

  async removeCabinet(cabinetId: string): Promise<void> {
    await storage.set(currentCabinets => currentCabinets.filter(c => c.id !== cabinetId));
  },

  async updateCabinet(cabinetId: string, updates: Partial<Cabinet>): Promise<void> {
    await storage.set(currentCabinets => {
      const cabinetIndex = currentCabinets.findIndex(c => c.id === cabinetId);

      if (cabinetIndex >= 0) {
        const updated = [...currentCabinets];
        updated[cabinetIndex] = {
          ...updated[cabinetIndex],
          ...updates,
          updatedAt: Date.now(),
        };
        return updated;
      }
      return currentCabinets; // No change if cabinet not found
    });
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
