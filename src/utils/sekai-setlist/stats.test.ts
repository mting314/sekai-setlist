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
    expect(stats.kpis.performedCatalogSongs).toBe(287);
    expect(stats.kpis.unperformedCatalogSongs).toBe(stats.kpis.totalCatalogSongs - 287);
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
    expect(unperformed.commissioned.length).toBe(40);
    expect(unperformed.coversAndOther.length).toBe(stats.kpis.unperformedCatalogSongs - 40);
    // Verify each commissioned item is marked commissioned
    for (const song of unperformed.commissioned) {
      expect(song.commissioned).toBe(true);
    }
  });

  it('computes songs awaiting 2D or 3D live debut with appearance trackers', () => {
    const stats = computeSekaiStats();
    const { allAwaiting } = stats.unperformed;

    // All awaiting commissioned songs (awaiting 2D or 3D)
    expect(allAwaiting.commissioned.length).toBe(119);
    expect(allAwaiting.coversAndOther.length).toBe(513);

    // Verify all items are awaiting at least one format
    for (const song of allAwaiting.commissioned) {
      expect(song.total2dCount === 0 || song.cast3dCount === 0).toBe(true);
    }

    // Awaiting 2D debut (neither COLORFUL LIVE nor Connect Live)
    const awaiting2d = allAwaiting.commissioned.filter((s) => s.total2dCount === 0);
    expect(awaiting2d.length).toBe(77);

    // Some songs awaiting 2D have already debuted in 3D Cast
    const awaiting2dWith3dDebut = awaiting2d.filter((s) => s.cast3dCount > 0);
    expect(awaiting2dWith3dDebut.length).toBe(30);
    expect(awaiting2dWith3dDebut[0].first3dLiveName).toBeDefined();

    // Awaiting 3D debut
    const awaiting3d = allAwaiting.commissioned.filter((s) => s.cast3dCount === 0);
    expect(awaiting3d.length).toBe(89);

    // Some songs awaiting 3D have already debuted in 2D (COLORFUL LIVE or Connect Live)
    const awaiting3dWith2dDebut = awaiting3d.filter((s) => s.total2dCount > 0);
    expect(awaiting3dWith2dDebut.length).toBe(42);
    expect(awaiting3dWith2dDebut[0].first2dLiveName).toBeDefined();

    // Awaiting both 2D and 3D
    const awaitingBoth = allAwaiting.commissioned.filter(
      (s) => s.total2dCount === 0 && s.cast3dCount === 0
    );
    expect(awaitingBoth.length).toBe(47);
  });
});
