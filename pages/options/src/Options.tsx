import '@src/Options.css';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, cabinetStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
import { useState } from 'react';

type SettingsSection = 'general' | 'appearance' | 'behavior' | 'data' | 'about';

const Options = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const cabinets = useStorage(cabinetStorage);
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [searchQuery, setSearchQuery] = useState('');

  const logo = isLight ? 'options/cabinet_logo.svg' : 'options/cabinet_logo_dark.svg';

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  const WarningCard = ({ title }: { title: string }) => (
    <div
      className={cn(
        'mb-6 rounded-lg border-l-4 p-4',
        isLight ? 'border-amber-400 bg-amber-50' : 'border-amber-500 bg-amber-900/20',
      )}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-xl">⚠️</span>
        </div>
        <div className="ml-3">
          <h4 className={cn('text-sm font-medium', isLight ? 'text-amber-800' : 'text-amber-300')}>
            {title} - Not Functional Yet
          </h4>
          <p className={cn('mt-1 text-sm', isLight ? 'text-amber-700' : 'text-amber-400')}>
            These settings are for preview only and do not affect the extension's behavior. Functionality will be
            implemented in a future update.
          </p>
        </div>
      </div>
    </div>
  );

  const sidebarItems = [
    { id: 'general' as const, label: 'General Settings', icon: '⚙️', underConstruction: true },
    { id: 'appearance' as const, label: 'Appearance', icon: '🎨', underConstruction: false },
    { id: 'behavior' as const, label: 'Behavior', icon: '🔧', underConstruction: true },
    { id: 'data' as const, label: 'Data Management', icon: '💾', underConstruction: true },
    { id: 'about' as const, label: 'About', icon: 'ℹ️', underConstruction: false },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className={cn('mb-4 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
          General Settings
        </h3>

        <WarningCard title="General Settings" />

        <div className="space-y-4">
          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <label
              htmlFor="cabinet-name-pattern"
              className={cn('mb-2 block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Default Cabinet Name Pattern
            </label>
            <input
              id="cabinet-name-pattern"
              type="text"
              placeholder="Cabinet {date} - {time}"
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100',
              )}
            />
            <p className={cn('mt-1 text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>
              Use {'{date}'}, {'{time}'}, {'{url}'} as placeholders
            </p>
          </div>

          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <label
              htmlFor="max-tabs-per-cabinet"
              className={cn('mb-2 block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Maximum Tabs per Cabinet
            </label>
            <select
              id="max-tabs-per-cabinet"
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100',
              )}>
              <option value="50">50 tabs</option>
              <option value="100">100 tabs</option>
              <option value="200">200 tabs</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>

          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="show-confirmation-dialogs"
                  className={cn('block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
                  Show Confirmation Dialogs
                </label>
                <p className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>
                  Ask for confirmation before deleting or restoring cabinets
                </p>
              </div>
              <input
                id="show-confirmation-dialogs"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className={cn('mb-4 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
          Appearance Settings
        </h3>

        <div className="space-y-4">
          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <div className={cn('mb-3 block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Theme
            </div>
            <div className="flex gap-3">
              <ToggleButton className="mt-0">{t('toggleTheme')}</ToggleButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBehaviorSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className={cn('mb-4 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
          Behavior Settings
        </h3>

        <WarningCard title="Behavior Settings" />

        <div className="space-y-4">
          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="auto-save-window-close"
                  className={cn('block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
                  Auto-save on Window Close
                </label>
                <p className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>
                  Automatically create a cabinet when closing a window
                </p>
              </div>
              <input
                id="auto-save-window-close"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>

          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <label
              htmlFor="restore-behavior"
              className={cn('mb-2 block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Restore Behavior
            </label>
            <select
              id="restore-behavior"
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100',
              )}>
              <option value="new-window">Open in new window</option>
              <option value="current-window">Replace current window</option>
              <option value="ask">Ask each time</option>
            </select>
          </div>

          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="preserve-tab-groups"
                  className={cn('block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
                  Preserve Tab Groups
                </label>
                <p className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>
                  Maintain tab group relationships when restoring
                </p>
              </div>
              <input
                id="preserve-tab-groups"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className={cn('mb-4 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
          Data Management
        </h3>

        <WarningCard title="Data Management" />

        <div className="space-y-4">
          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <h4 className={cn('mb-2 text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Storage Information
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>Total Cabinets:</span>
                <span className={cn(isLight ? 'text-gray-900' : 'text-gray-100')}>{cabinets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>Total Tabs:</span>
                <span className={cn(isLight ? 'text-gray-900' : 'text-gray-100')}>
                  {cabinets.reduce((sum, cabinet) => sum + cabinet.tabs.length, 0)}
                </span>
              </div>
            </div>
          </div>

          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <h4 className={cn('mb-3 text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Export & Import
            </h4>
            <div className="flex gap-3">
              <button className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700">
                Export All Cabinets
              </button>
              <button
                className={cn(
                  'rounded-md border px-4 py-2 text-sm transition-colors',
                  isLight
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700',
                )}>
                Import Cabinets
              </button>
            </div>
          </div>

          <div className={cn('rounded-lg border border-red-200 p-4', isLight ? 'bg-red-50' : 'bg-red-900/20')}>
            <h4 className={cn('mb-2 text-sm font-medium', isLight ? 'text-red-800' : 'text-red-300')}>Danger Zone</h4>
            <p className={cn('mb-3 text-xs', isLight ? 'text-red-600' : 'text-red-400')}>
              This action cannot be undone. All your cabinets and settings will be permanently deleted.
            </p>
            <button className="rounded-md bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700">
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAboutSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className={cn('mb-4 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
          About The Cabinet
        </h3>

        <div className="space-y-4">
          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <div className="mb-4 flex items-center gap-4">
              <img src={chrome.runtime.getURL(logo)} alt="The Cabinet" className="h-12 w-auto" />
              <div>
                <h4 className={cn('font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>The Cabinet</h4>
                <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
                  Professional Tab Management
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>Version:</span>
                <span className={cn(isLight ? 'text-gray-900' : 'text-gray-100')}>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>Last Updated:</span>
                <span className={cn(isLight ? 'text-gray-900' : 'text-gray-100')}>October 2024</span>
              </div>
            </div>
          </div>

          <div
            className={cn(
              'rounded-lg border p-4',
              isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
            )}>
            <h4 className={cn('mb-3 text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Links & Support
            </h4>
            <div className="space-y-2">
              <button
                onClick={goGithubSite}
                className={cn(
                  'flex items-center gap-2 text-sm text-blue-600 transition-colors hover:text-blue-700',
                  !isLight && 'text-blue-400 hover:text-blue-300',
                )}>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'behavior':
        return renderBehaviorSettings();
      case 'data':
        return renderDataSettings();
      case 'about':
        return renderAboutSection();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className={cn('min-h-screen', isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100')}>
      {/* Header */}
      <header
        className={cn('border-b px-6 py-4', isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={chrome.runtime.getURL(logo)} alt="The Cabinet" className="h-8 w-auto" />
            <h1 className={cn('text-xl font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>Settings</h1>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn(
                'w-64 rounded-md border px-3 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
                isLight
                  ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  : 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400',
              )}
            />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'min-h-screen w-64 border-r',
            isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
          )}>
          <nav className="p-4">
            <ul className="space-y-2">
              {sidebarItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      activeSection === item.id
                        ? isLight
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-blue-700 bg-blue-900/50 text-blue-300'
                        : isLight
                          ? 'text-gray-700 hover:bg-gray-50'
                          : 'text-gray-300 hover:bg-gray-700',
                    )}>
                    <span className="text-base">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.underConstruction && (
                      <span className="text-xs" title="Under Construction">
                        🚧
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
