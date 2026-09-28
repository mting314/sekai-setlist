/**
 * Joins sekai-story-indexer's events_index.json onto songs: each event's song gets the event
 * (and its nickname). Used by scripts/fetch-sekai-songs.ts.
 */
import type { SekaiSongEvent } from '~/types/sekai';

/** The fields of an events_index.json record this join reads. */
export interface IndexedEvent {
  event_id: number;
  name: string;
  event_type: string;
  started_at: number;
  song_id?: number | null;
  nickname?: string | null;
  wl_alias?: string | null;
}

/** Song id -> its events, oldest first. World Link parts use their alias as the nickname. */
export function songEventsById(
  events: IndexedEvent[],
  enNames: ReadonlyMap<number, string> = new Map()
): Map<string, SekaiSongEvent[]> {
  const out = new Map<string, SekaiSongEvent[]>();
  const sorted = events.toSorted((a, b) => a.started_at - b.started_at || a.event_id - b.event_id);
  for (const e of sorted) {
    if (e.song_id == null) continue;
    const nickname = e.nickname || e.wl_alias || undefined;
    const nameEn = enNames.get(e.event_id);
    const event: SekaiSongEvent = {
      id: e.event_id,
      name: e.name,
      ...(nameEn && nameEn !== e.name ? { nameEn } : {}),
      ...(nickname ? { nickname } : {}),
      type: e.event_type,
      startedAt: e.started_at
    };
    const key = String(e.song_id);
    out.set(key, [...(out.get(key) ?? []), event]);
  }
  return out;
}

/** Master-DB credit fields use "-" (or "") for none. */
export const credit = (value?: string | null) =>
  value && value.trim() !== '-' ? value.trim() : undefined;
