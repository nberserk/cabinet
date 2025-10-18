import { useStorage } from '@extension/shared';
import { exampleThemeStorage, cabinetStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import { useState } from 'react';
import type { Cabinet, Tab } from '@extension/shared';

interface SaveCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cabinetData: { name: string; description?: string; tags?: string[] }) => void;
  isLight: boolean;
}

const SaveCabinetModal = ({ isOpen, onClose, onSave, isLight }: SaveCabinetModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

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
      <div className={cn('w-80 rounded-lg p-6 shadow-lg', isLight ? 'bg-white' : 'bg-gray-800')}>
        <h2 className={cn('mb-4 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>Save Cabinet</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="cabinet-name"
              className={cn('mb-2 block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Name *
            </label>
            <input
              id="cabinet-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter cabinet name"
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm',
                isLight
                  ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  : 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
              )}
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="cabinet-description"
              className={cn('mb-2 block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Description
            </label>
            <textarea
              id="cabinet-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className={cn(
                'w-full resize-none rounded-md border px-3 py-2 text-sm',
                isLight
                  ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  : 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
              )}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="cabinet-tags"
              className={cn('mb-2 block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Tags
            </label>
            <input
              id="cabinet-tags"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Comma-separated tags (e.g., work, research)"
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm',
                isLight
                  ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  : 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
              )}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={cn(
                'flex-1 rounded-md px-4 py-2 text-sm transition-colors',
                isLight
                  ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'border border-gray-600 text-gray-300 hover:bg-gray-700',
              )}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className={cn(
                'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                !name.trim() || saving
                  ? 'cursor-not-allowed bg-gray-400 text-gray-200'
                  : isLight
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600',
              )}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CabinetInfo = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      console.log('Cabinet saved successfully:', cabinet.name);

      // Show success feedback
      setSuccessMessage(`Cabinet "${cabinet.name}" saved successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save cabinet:', error);
      // Show error feedback (you could add a toast notification here)
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={cn('border-b p-4', isLight ? 'border-gray-200 bg-white' : 'border-gray-600 bg-gray-800')}>
        <button
          onClick={() => setShowModal(true)}
          disabled={saving}
          className={cn(
            'w-full rounded-md px-4 py-2 text-sm font-medium transition-colors',
            saving
              ? 'cursor-not-allowed bg-gray-400 text-gray-200'
              : isLight
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-500 text-white hover:bg-blue-600',
          )}>
          {saving ? 'Saving Cabinet...' : 'Save Cabinet'}
        </button>

        {successMessage && (
          <div
            className={cn(
              'mt-2 rounded-md p-2 text-xs',
              isLight
                ? 'border border-green-200 bg-green-100 text-green-800'
                : 'border border-green-700 bg-green-900 text-green-200',
            )}>
            {successMessage}
          </div>
        )}
      </div>

      <SaveCabinetModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveCabinet}
        isLight={isLight}
      />
    </>
  );
};

export default CabinetInfo;
