import { useEffect, useState } from 'react';
import { listPredictions, PREDICTIONS_EVENT } from '~/utils/sekai-setlist/predictions-store';
import type { SekaiPrediction } from '~/types/sekai-prediction';

/**
 * Your saved predictions, newest first (only those for `live` when given). Empty during SSR /
 * prerender and the first client render, then read from localStorage and kept in sync with
 * other tabs and components. `ready` is false until then.
 */
export function usePredictions(live?: string) {
  const [predictions, setPredictions] = useState<SekaiPrediction[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => setPredictions(listPredictions(live));
    load();
    setReady(true);
    window.addEventListener('storage', load);
    window.addEventListener(PREDICTIONS_EVENT, load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener(PREDICTIONS_EVENT, load);
    };
  }, [live]);

  return { predictions, ready };
}
