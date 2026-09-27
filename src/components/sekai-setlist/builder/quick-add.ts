// The non-song rows you can drop into a setlist: an MC, or an encore / intermission divider.
import { DIVIDER_TITLES, itemId } from '~/utils/sekai-setlist/prediction';
import type { PredictionItem } from '~/types/sekai-prediction';

export type QuickAddType = 'mc' | 'encore' | 'intermission';
export const QUICK_ADD_TYPES: QuickAddType[] = ['mc', 'encore', 'intermission'];

export const quickAddTitle = (type: QuickAddType) =>
  type === 'mc' ? 'MC' : `━━ ${DIVIDER_TITLES[type]} ━━`;

export const newQuickAddItem = (type: QuickAddType): PredictionItem =>
  type === 'mc' ? { id: itemId(), type, title: 'MC' } : { id: itemId(), type };
