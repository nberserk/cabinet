import '@src/SidePanel.css';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
import CabinetInfo from './CabinetInfo';
import TabList from './TabList';

const SidePanel = () => {
    const { isLight } = useStorage(exampleThemeStorage);

    return (
        <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800', 'min-h-screen')}>
            <CabinetInfo />
            <TabList />
            <ToggleButton onClick={exampleThemeStorage.toggle}>{t('toggleTheme')}</ToggleButton>
        </div>
    );
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
