import { createStorage, StorageEnum } from '../base/index.js';
import type { BaseStorageType } from '../base/types.js';
import type { Cabinet, CabinetCollection } from '../../../shared/lib/types/cabinet.js';

type CabinetStorageType = BaseStorageType<CabinetCollection> & {
    addCabinet: (cabinet: Cabinet) => Promise<void>;
    removeCabinet: (cabinetId: string) => Promise<void>;
    updateCabinet: (cabinetId: string, updates: Partial<Cabinet>) => Promise<void>;
    getCabinet: (cabinetId: string) => Promise<Cabinet | null>;
    getAllCabinets: () => Promise<Cabinet[]>;
    searchCabinets: (query: string) => Promise<Cabinet[]>;
};

const storage = createStorage<CabinetCollection>('cabinet-collection-key', {
    cabinets: [],
    lastModified: Date.now(),
}, {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
});

export const cabinetStorage: CabinetStorageType = {
    ...storage,

    async addCabinet(cabinet: Cabinet): Promise<void> {
        const collection = await storage.get();
        const existingIndex = collection.cabinets.findIndex(c => c.id === cabinet.id);

        if (existingIndex >= 0) {
            // Update existing cabinet
            collection.cabinets[existingIndex] = { ...cabinet, updatedAt: Date.now() };
        } else {
            // Add new cabinet
            collection.cabinets.push(cabinet);
        }

        collection.lastModified = Date.now();
        await storage.set(collection);
    },

    async removeCabinet(cabinetId: string): Promise<void> {
        const collection = await storage.get();
        collection.cabinets = collection.cabinets.filter(c => c.id !== cabinetId);
        collection.lastModified = Date.now();
        await storage.set(collection);
    },

    async updateCabinet(cabinetId: string, updates: Partial<Cabinet>): Promise<void> {
        const collection = await storage.get();
        const cabinetIndex = collection.cabinets.findIndex(c => c.id === cabinetId);

        if (cabinetIndex >= 0) {
            collection.cabinets[cabinetIndex] = {
                ...collection.cabinets[cabinetIndex],
                ...updates,
                updatedAt: Date.now(),
            };
            collection.lastModified = Date.now();
            await storage.set(collection);
        }
    },

    async getCabinet(cabinetId: string): Promise<Cabinet | null> {
        const collection = await storage.get();
        return collection.cabinets.find(c => c.id === cabinetId) || null;
    },

    async getAllCabinets(): Promise<Cabinet[]> {
        const collection = await storage.get();
        return collection.cabinets.sort((a, b) => b.createdAt - a.createdAt);
    },

    async searchCabinets(query: string): Promise<Cabinet[]> {
        const collection = await storage.get();
        const lowercaseQuery = query.toLowerCase();

        return collection.cabinets.filter(cabinet =>
            cabinet.name.toLowerCase().includes(lowercaseQuery) ||
            cabinet.metadata.description?.toLowerCase().includes(lowercaseQuery) ||
            cabinet.metadata.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
            cabinet.tabs.some(tab =>
                tab.title.toLowerCase().includes(lowercaseQuery) ||
                tab.url.toLowerCase().includes(lowercaseQuery)
            )
        ).sort((a, b) => b.createdAt - a.createdAt);
    },
};