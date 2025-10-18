import { useStorage } from '@extension/shared';
import { exampleThemeStorage, cabinetStorage, windowCabinetMappingStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import { useState, useEffect } from 'react';
import type { Cabinet, Tab } from '@extension/shared';

interface SaveCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cabinetData: { name: string; description?: string; tags?: string[] }) => void;
  isLight: boolean;
  existingCabinet?: Cabinet | null;
}

const SaveCabinetModal = ({ isOpen, onClose, onSave, isLight, existingCabinet }: SaveCabinetModalProps) => {
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
      <div className={cn('w-80 rounded-lg p-6 shadow-lg', isLight ? 'bg-white' : 'bg-gray-800')}>
        <h2 className={cn('mb-4 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
          {existingCabinet ? 'Update Cabinet' : 'Save Cabinet'}
        </h2>

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
              {saving ? (existingCabinet ? 'Updating...' : 'Saving...') : existingCabinet ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CabinetInfo = () => {
  const { isLight } = useStorage(exampleThemeStorage);
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
      <div className={cn('border-b p-4', isLight ? 'border-gray-200 bg-white' : 'border-gray-600 bg-gray-800')}>
        {/* Debug Info - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <div
            className={cn(
              'mb-3 rounded-md p-2 text-xs',
              isLight ? 'border border-gray-200 bg-gray-50' : 'border border-gray-600 bg-gray-800',
            )}>
            <div className={cn('mb-1 font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>Window Info (Dev)</div>
            <div className={cn('space-y-1', isLight ? 'text-gray-600' : 'text-gray-400')}>
              <div>Window ID: {currentWindowId || 'Loading...'}</div>
              <div>Mapping Status: {mappedCabinet ? 'Mapped' : 'No mapping'}</div>
              {currentWindowId && <div>Mapped Cabinet ID: {windowCabinetMapping[currentWindowId] || 'None'}</div>}
              <div>Environment: {process.env.NODE_ENV}</div>
            </div>
          </div>
        )}

        {/* Cabinet Info Section - Always Show */}
        <div
          className={cn(
            'mb-3 rounded-md p-3',
            mappedCabinet
              ? isLight
                ? 'border border-blue-200 bg-blue-50'
                : 'border border-blue-700 bg-blue-900'
              : isLight
                ? 'border border-gray-200 bg-gray-50'
                : 'border border-gray-600 bg-gray-800',
          )}>
          <div
            className={cn(
              'mb-2 text-xs font-medium',
              mappedCabinet
                ? isLight
                  ? 'text-blue-800'
                  : 'text-blue-200'
                : isLight
                  ? 'text-gray-700'
                  : 'text-gray-300',
            )}>
            Current Cabinet
          </div>

          <div
            className={cn(
              'mb-1 text-sm font-semibold',
              mappedCabinet
                ? isLight
                  ? 'text-blue-900'
                  : 'text-blue-100'
                : isLight
                  ? 'text-gray-600'
                  : 'text-gray-400',
            )}>
            {mappedCabinet ? mappedCabinet.name : 'Untitled'}
          </div>

          {mappedCabinet && (
            <>
              <div className={cn('mb-2 font-mono text-xs', isLight ? 'text-blue-600' : 'text-blue-400')}>
                ID: {mappedCabinet.id}
              </div>

              {mappedCabinet.description && (
                <div className={cn('mb-2 text-xs', isLight ? 'text-blue-700' : 'text-blue-300')}>
                  {mappedCabinet.description}
                </div>
              )}

              <div className={cn('space-y-1 text-xs', isLight ? 'text-blue-600' : 'text-blue-400')}>
                <div>Tabs: {mappedCabinet.tabs.length}</div>
                <div>Created: {new Date(mappedCabinet.createdAt).toLocaleDateString()}</div>
                <div>Updated: {new Date(mappedCabinet.updatedAt).toLocaleDateString()}</div>
                {mappedCabinet.tags && mappedCabinet.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {mappedCabinet.tags.map((tag, index) => (
                      <span
                        key={index}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-800 text-blue-200',
                        )}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

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
          {saving
            ? mappedCabinet
              ? 'Updating Cabinet...'
              : 'Saving Cabinet...'
            : mappedCabinet
              ? 'Update Cabinet'
              : 'Save Cabinet'}
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
        existingCabinet={mappedCabinet}
      />
    </>
  );
};

export default CabinetInfo;
