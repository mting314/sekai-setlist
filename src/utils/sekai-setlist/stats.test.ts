import { describe, expect, it } from 'vitest';
import { computeSekaiStats, getLiveFormat } from './stats';

describe('computeSekaiStats', () => {
  it('correctly classifies live formats', () => {
    expect(getLiveFormat('thanks_festival')).toBe('cast_3d');
    expect(getLiveFormat('fan_meeting')).toBe('cast_3d');
    expect(getLiveFormat('colorful_live')).toBe('screen_2d');
    expect(getLiveFormat('connect_live')).toBe('connect_live');
    expect(getLiveFormat('sekai_symphony')).toBe('symphony');
  });

  it('computes accurate overall KPIs', () => {
    const stats = computeSekaiStats();
    expect(stats.kpis.totalLives).toBeGreaterThan(30);
    expect(stats.kpis.totalLiveAppearances).toBeGreaterThan(700);
    expect(stats.kpis.performedCatalogSongs).toBe(265);
    expect(stats.kpis.unperformedCatalogSongs).toBe(stats.kpis.totalCatalogSongs - 265);
    expect(stats.kpis.cast3dPerformances).toBeGreaterThan(100);
    expect(stats.kpis.screen2dPerformances).toBeGreaterThan(150);
  });

  it('computes 2D vs 3D format overlap correctly', () => {
    const stats = computeSekaiStats();
    const { overlap } = stats.formatComparison;
    expect(overlap.both2dAnd3d.length).toBeGreaterThan(30);
    expect(overlap.screen2dOnly.length).toBeGreaterThan(50);
    expect(overlap.cast3dOnly.length).toBeGreaterThan(50);
  });

  it('computes release delay statistics and buckets', () => {
    const stats = computeSekaiStats();
    const { releaseDelay } = stats;
    expect(releaseDelay.buckets.length).toBe(7);
    expect(releaseDelay.fastestDebuts.length).toBe(10);
    expect(releaseDelay.longestWaits.length).toBe(10);
    // Fastest includes pre-release debuts with negative days
    expect(releaseDelay.fastestDebuts[0].daysToDebut).toBeLessThan(0);
    // Longest wait should be over 2000 days
    expect(releaseDelay.longestWaits[0].daysToDebut).toBeGreaterThan(2000);
  });

  it('computes character focus matrix for 20 characters across cycles', () => {
    const stats = computeSekaiStats();
    const { focusMatrix } = stats;
    expect(focusMatrix.characters.length).toBe(20);
    expect(focusMatrix.totalFocusSongs).toBe(130);
    expect(focusMatrix.performedFocusSongs).toBeGreaterThan(100);
    expect(focusMatrix.completionRate).toBeGreaterThan(75);

    // Verify first character (Ichika Hoshino) has focus 1
    const ichika = focusMatrix.characters[0];
    expect(ichika.name).toBe('Ichika Hoshino');
    expect(ichika.cycles[0]?.cycle).toBe(1);
    expect(ichika.cycles[0]?.isPerformed).toBe(true);
  });

  it('computes version breakdown with short/game version counts', () => {
    const stats = computeSekaiStats();
    const { versionBreakdown } = stats;
    expect(versionBreakdown.shortOrGameCount).toBe(11);
    expect(versionBreakdown.shortVersionItems.length).toBe(11);
    expect(versionBreakdown.fullVersionCount).toBe(
      versionBreakdown.totalPerformances - versionBreakdown.shortOrGameCount
    );
  });

  it('computes unperformed songs separated by commissioned and covers', () => {
    const stats = computeSekaiStats();
    const { unperformed } = stats;
    expect(unperformed.total).toBe(stats.kpis.unperformedCatalogSongs);
    expect(unperformed.commissioned.length).toBe(55);
    expect(unperformed.coversAndOther.length).toBe(stats.kpis.unperformedCatalogSongs - 55);
    // Verify each commissioned item is marked commissioned
    for (const song of unperformed.commissioned) {
      expect(song.commissioned).toBe(true);
    }
  });
});
