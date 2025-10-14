import type { Tab } from '@extension/shared';

export interface TabUI extends Tab {
  highlighted: boolean;
  level: number;
  children: TabUI[];  // run time data
}