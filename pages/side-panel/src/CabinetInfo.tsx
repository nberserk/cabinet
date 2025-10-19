import { useStorage } from '@extension/shared';
import { cabinetStorage, windowCabinetMappingStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import { useState, useEffect } from 'react';
import type { Cabinet, Tab } from '@extension/shared';

interface SaveCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cabinetData: { name: string; description?: string; tags?: string[] }) => void;
  existingCabinet?: Cabinet | null;
}

const SaveCabinetModal = ({ isOpen, onClose, onSave, existingCabinet }: SaveCabinetModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-populate form when editing existing cabinet
  useEffect(() => {
    if (isOpen) {
      if (existingCabinet) {
        setName(existingCabinet.name);
        setDescription(existingCabinet.description || '');
        setTags(existingCabinet.tags?.join(', ') || '');
      } else {
        setName('');
        setDescription('');
        setTags('');
      }
    }
  }, [isOpen, existingCabinet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
      });

      // Reset form
      setName('');
      setDescription('');
      setTags('');
      onClose();
    } catch (error) {
      console.error('Failed to save cabinet:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-80 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {existingCabinet ? 'Update Cabinet' : 'Save Cabinet'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="cabinet-name" className="mb-2 block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              id="cabinet-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter cabinet name"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="cabinet-description" className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="cabinet-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="cabinet-tags" className="mb-2 block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              id="cabinet-tags"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Comma-separated tags (e.g., work, research)"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className={cn(
                'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                !name.trim() || saving
                  ? 'cursor-not-allowed bg-gray-400 text-gray-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700',
              )}>
              {saving ? (existingCabinet ? 'Updating...' : 'Saving...') : existingCabinet ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CabinetInfo = () => {
  const windowCabinetMapping = useStorage(windowCabinetMappingStorage);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
  const [mappedCabinet, setMappedCabinet] = useState<Cabinet | null>(null);

  // Get current window ID and mapped cabinet
  useEffect(() => {
    const getCurrentWindow = async () => {
      try {
        const currentWindow = await chrome.windows.getCurrent();
        if (currentWindow.id) {
          setCurrentWindowId(currentWindow.id);
        }
      } catch (error) {
        console.error('Failed to get current window:', error);
      }
    };
    getCurrentWindow();
  }, []);

  // Update mapped cabinet when window or mapping changes
  useEffect(() => {
    const updateMappedCabinet = async () => {
      if (currentWindowId) {
        const mappedCabinetId = windowCabinetMapping[currentWindowId];
        if (mappedCabinetId) {
          try {
            const cabinet = await cabinetStorage.getCabinet(mappedCabinetId);
            setMappedCabinet(cabinet);
          } catch (error) {
            console.error('Failed to get mapped cabinet:', error);
            setMappedCabinet(null);
          }
        } else {
          setMappedCabinet(null);
        }
      }
    };
    updateMappedCabinet();
  }, [currentWindowId, windowCabinetMapping]);

  const getCurrentWindowTabs = async (): Promise<{ tabs: Tab[]; activeTabId?: number }> => {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      const chromeTabs = await chrome.tabs.query({ windowId: currentWindow.id });

      const tabs: Tab[] = chromeTabs
        .filter(tab => tab.id !== undefined)
        .map(tab => ({
          id: tab.id!,
          title: tab.title || 'Untitled',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl,
          openerId: tab.openerTabId,
        }));

      const activeTab = chromeTabs.find(tab => tab.active);

      return {
        tabs,
        activeTabId: activeTab?.id,
      };
    } catch (error) {
      console.error('Error getting current window tabs:', error);
      return { tabs: [] };
    }
  };

  const handleSaveCabinet = async (cabinetData: { name: string; description?: string; tags?: string[] }) => {
    setSaving(true);
    try {
      const { tabs, activeTabId } = await getCurrentWindowTabs();

      if (tabs.length === 0) {
        throw new Error('No tabs found in current window');
      }

      if (mappedCabinet) {
        // Update existing cabinet
        await cabinetStorage.updateCabinet(mappedCabinet.id, {
          name: cabinetData.name,
          description: cabinetData.description,
          tags: cabinetData.tags,
          tabs,
          activeTabId: activeTabId || tabs[0].id,
        });
        console.log('Cabinet updated successfully:', cabinetData.name);
        setSuccessMessage(`Cabinet "${cabinetData.name}" updated successfully!`);
      } else {
        // Create new cabinet
        const cabinet: Cabinet = {
          id: `cabinet_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          name: cabinetData.name,
          description: cabinetData.description,
          tags: cabinetData.tags,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tabs,
          activeTabId: activeTabId || tabs[0].id,
        };

        await cabinetStorage.addCabinet(cabinet);

        // Create window-cabinet mapping for new cabinet
        if (currentWindowId) {
          await windowCabinetMappingStorage.setMapping(currentWindowId, cabinet.id);
        }

        console.log('Cabinet saved successfully:', cabinet.name);
        setSuccessMessage(`Cabinet "${cabinet.name}" saved successfully!`);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save/update cabinet:', error);
      // Show error feedback (you could add a toast notification here)
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={cn('mb-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-left')}>
        Cabinet Section:
        <div>
          {mappedCabinet && (
            <div className="grid grid-cols-1 gap-4 text-xs">
              <div>
                <span className="font-medium text-blue-800">Linked Cabinet:</span>
                <span className="ml-1 text-blue-600">{mappedCabinet.name}</span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={saving}
          className={cn(
            'w-full rounded-md px-4 py-2 text-sm font-medium transition-colors',
            saving ? 'cursor-not-allowed bg-gray-400 text-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700',
          )}>
          {saving
            ? mappedCabinet
              ? 'Updating Cabinet...'
              : 'Saving Cabinet...'
            : mappedCabinet
              ? 'Update Cabinet'
              : 'Save Cabinet'}
        </button>
        {successMessage && (
          <div className="mt-2 rounded-md border border-green-200 bg-green-100 p-2 text-xs text-green-800">
            {successMessage}
          </div>
        )}
      </div>

      <SaveCabinetModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveCabinet}
        existingCabinet={mappedCabinet}
      />
    </>
  );
};

export default CabinetInfo;
