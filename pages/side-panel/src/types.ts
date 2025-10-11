export interface Tab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  highlighted: boolean;
  openerId?: number;
  level: number;
  children: Tab[];
}

export interface TabEvent {
  type: 'created' | 'removed' | 'updated';
  tab: chrome.tabs.Tab;
}
