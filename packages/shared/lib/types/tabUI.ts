import type { Tab } from './tab.js';

export interface TabUI extends Tab {
  highlighted: boolean;
  level: number;
  children: TabUI[]; // run time data
}
