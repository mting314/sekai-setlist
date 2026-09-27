// Scores a setlist prediction against the real setlist, with the setlist-prediction rules from
// the-sorter: points for each predicted song by how close it landed, plus opener / closer /
// encore-break bonuses. Unordered ("bag") predictions only score which songs were played.
import type { SetlistState } from './share';

export interface ScoringRules {
  exact: number; // same song at the same position
  close: number; // same song within closeRange positions
  closeRange: number;
  present: number; // same song anywhere else in the setlist
  opener: number;
  closer: number;
  encoreBreak: number; // encore divider before the same position
  bagHit: number; // unordered predictions: a predicted song that was performed
}

export const DEFAULT_SCORING_RULES: ScoringRules = {
  exact: 15,
  close: 8,
  closeRange: 2,
  present: 3,
  opener: 5,
  closer: 5,
  encoreBreak: 5,
  bagHit: 10
};

export type MatchKind = 'exact' | 'close' | 'present' | 'miss';

export interface SongResult {
  songId: string;
  kind: MatchKind;
  points: number;
  actualAt?: number; // index into the actual setlist this prediction was matched to
}

export interface Bonuses {
  opener: boolean;
  closer: boolean;
  encoreBreak: boolean | undefined; // undefined when the real setlist had no encore
}

export interface ScoreResult {
  ordered: boolean;
  songs: SongResult[]; // one per predicted song, in predicted order
  missed: number[]; // actual-setlist indices no prediction matched
  bonuses: Bonuses;
  total: number;
  max: number;
  accuracy: number; // total / max, 0 when the real setlist is empty
}

const encoreStart = (s: SetlistState): number | undefined =>
  s.encore.length ? Math.min(...s.encore) : undefined;

/**
 * Each actual entry is consumed by at most one prediction, so a reprise has to be predicted twice
 * to score twice. Matching runs exact → close → present so a song is credited its best landing.
 */
export function scorePrediction(
  prediction: SetlistState,
  actual: SetlistState,
  rules: ScoringRules = DEFAULT_SCORING_RULES
): ScoreResult {
  const pred = prediction.songs;
  const act = actual.songs;
  const used = new Set<number>();
  const songs: SongResult[] = pred.map((songId) => ({ songId, kind: 'miss', points: 0 }));
  const claim = (i: number, j: number, kind: MatchKind, points: number) => {
    used.add(j);
    songs[i] = { songId: pred[i], kind, points, actualAt: j };
  };
  const firstFree = (id: string) => act.findIndex((a, j) => a === id && !used.has(j));

  if (!prediction.ordered) {
    pred.forEach((id, i) => {
      const j = firstFree(id);
      if (j >= 0) claim(i, j, 'present', rules.bagHit);
    });
    const total = songs.reduce((n, s) => n + s.points, 0);
    const max = act.length * rules.bagHit;
    return {
      ordered: false,
      songs,
      missed: act.map((_, j) => j).filter((j) => !used.has(j)),
      bonuses: { opener: false, closer: false, encoreBreak: undefined },
      total,
      max,
      accuracy: max ? total / max : 0
    };
  }

  pred.forEach((id, i) => {
    if (act[i] === id) claim(i, i, 'exact', rules.exact);
  });
  pred.forEach((id, i) => {
    if (songs[i].kind !== 'miss') return;
    // Nearest free position within range; ties go to the earlier one.
    const candidates = act
      .map((_, j) => j)
      .filter((j) => act[j] === id && !used.has(j) && Math.abs(i - j) <= rules.closeRange)
      .toSorted((a, b) => Math.abs(i - a) - Math.abs(i - b) || a - b);
    if (candidates.length) claim(i, candidates[0], 'close', rules.close);
  });
  pred.forEach((id, i) => {
    if (songs[i].kind !== 'miss') return;
    const j = firstFree(id);
    if (j >= 0) claim(i, j, 'present', rules.present);
  });

  const actualEncore = encoreStart(actual);
  const bonuses: Bonuses = {
    opener: pred.length > 0 && act.length > 0 && pred[0] === act[0],
    closer: pred.length > 0 && act.length > 0 && pred.at(-1) === act.at(-1),
    encoreBreak: actualEncore === undefined ? undefined : encoreStart(prediction) === actualEncore
  };
  const total =
    songs.reduce((n, s) => n + s.points, 0) +
    (bonuses.opener ? rules.opener : 0) +
    (bonuses.closer ? rules.closer : 0) +
    (bonuses.encoreBreak ? rules.encoreBreak : 0);
  const max = act.length
    ? act.length * rules.exact +
      rules.opener +
      rules.closer +
      (actualEncore === undefined ? 0 : rules.encoreBreak)
    : 0;
  return {
    ordered: true,
    songs,
    missed: act.map((_, j) => j).filter((j) => !used.has(j)),
    bonuses,
    total,
    max,
    accuracy: max ? total / max : 0
  };
}
