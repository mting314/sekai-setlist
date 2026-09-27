// A setlist prediction as the builder edits it: an ordered list of rows (songs, songs outside
// the catalog, MCs and encore / intermission dividers) for a lives.json live or a custom event.

export type PredictionItem =
  | { id: string; type: 'song'; songId: string; remarks?: string }
  | { id: string; type: 'custom'; name: string; remarks?: string } // a song not in the catalog
  | { id: string; type: 'mc'; title: string }
  | { id: string; type: 'encore' | 'intermission'; title?: string }; // divider rows

export type PredictionItemType = PredictionItem['type'];

export interface CustomEvent {
  name: string;
  date?: string;
  venue?: string;
}

export interface SekaiPrediction {
  id: string;
  name: string;
  live?: string; // lives.json id
  custom?: CustomEvent; // an event that isn't in lives.json
  items: PredictionItem[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export const isSongRow = (
  item: PredictionItem
): item is Extract<PredictionItem, { type: 'song' | 'custom' }> =>
  item.type === 'song' || item.type === 'custom';

export const isDividerRow = (
  item: PredictionItem
): item is Extract<PredictionItem, { type: 'encore' | 'intermission' }> =>
  item.type === 'encore' || item.type === 'intermission';
