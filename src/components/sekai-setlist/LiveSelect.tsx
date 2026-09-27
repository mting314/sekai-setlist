/**
 * Native <select> of lives: lives still waiting on a setlist first (soonest first), then past
 * setlists newest first. `withSetlist` limits it to lives that can be marked against.
 */
import { useTranslation } from 'react-i18next';
import { styled } from 'styled-system/jsx';
import { sekaiLiveName, sekaiLives } from '~/utils/sekai-setlist/live-data';

const Select = styled('select', {
  base: {
    cursor: 'pointer',
    borderRadius: 'l2',
    borderWidth: '1px',
    maxW: 'full',
    h: '9',
    px: '2',
    fontSize: 'sm',
    bgColor: 'bg.default'
  }
});

const byDate = (dir: 1 | -1) => (a: { startDate?: string }, b: { startDate?: string }) =>
  dir * (a.startDate ?? '').localeCompare(b.startDate ?? '');
const awaiting = sekaiLives.filter((l) => l.performances.length === 0).toSorted(byDate(1));
const performed = sekaiLives.filter((l) => l.performances.length > 0).toSorted(byDate(-1));

export interface LiveSelectProps {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  withSetlist?: boolean;
  noneLabel: string;
  'aria-label': string;
}

export function LiveSelect({ value, onChange, withSetlist, noneLabel, ...rest }: LiveSelectProps) {
  const { t, i18n } = useTranslation();
  const option = (l: (typeof sekaiLives)[number]) => (
    <option key={l.id} value={l.id}>
      {sekaiLiveName(l, i18n.language)}
      {l.startDate ? ` (${l.startDate})` : ''}
    </option>
  );
  return (
    <Select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      aria-label={rest['aria-label']}
    >
      <option value="">{noneLabel}</option>
      {!withSetlist && (
        <optgroup label={t('game.awaitingSetlist', { defaultValue: 'Setlist not out yet' })}>
          {awaiting.map(option)}
        </optgroup>
      )}
      <optgroup label={t('game.pastLives', { defaultValue: 'Past lives' })}>
        {performed.map(option)}
      </optgroup>
    </Select>
  );
}
