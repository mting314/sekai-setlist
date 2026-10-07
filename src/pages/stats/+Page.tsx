/**
 * Project Sekai Live Performance Statistics & Infographics (/stats)
 *
 * Visualizes 2D screen vs 3D cast formats, release-to-stage time differences,
 * character focus songs matrix, version lengths, and unperformed catalog songs.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { Text } from '~/components/ui/styled/text';
import { StatsKpis } from '~/components/sekai-setlist/stats/StatsKpis';
import { FormatComparisonSection } from '~/components/sekai-setlist/stats/FormatComparisonSection';
import { ReleaseDelaySection } from '~/components/sekai-setlist/stats/ReleaseDelaySection';
import { FocusMatrixSection } from '~/components/sekai-setlist/stats/FocusMatrixSection';
import { VersionBreakdownSection } from '~/components/sekai-setlist/stats/VersionBreakdownSection';
import { UnperformedSongsSection } from '~/components/sekai-setlist/stats/UnperformedSongsSection';
import { computeSekaiStats } from '~/utils/sekai-setlist/stats';

export function Page() {
  const { t } = useTranslation();
  const stats = useMemo(() => computeSekaiStats(), []);

  const pageTitle = t('stats.title', { defaultValue: 'Live Statistics & Infographics' });

  return (
    <>
      <Metadata title={pageTitle} helmet />
      <Stack gap={6} w="full" maxW="5xl" mx="auto" py={{ base: 2, md: 4 }}>
        {/* Page Header */}
        <Stack gap={1.5}>
          <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
            {pageTitle}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            {t('stats.description', {
              defaultValue:
                'Interactive analytics on Project Sekai lives: comparing 2D screen vs 3D cast formats, song release delays, character focus songs, and songs awaiting their stage debut.'
            })}
          </Text>
        </Stack>

        {/* Overview KPIs */}
        <StatsKpis kpis={stats.kpis} />

        {/* Section 1: 2D Screen vs 3D Cast Performance Breakdown */}
        <FormatComparisonSection
          counts={stats.formatComparison.counts}
          byUnit={stats.formatComparison.byUnit}
          overlap={stats.formatComparison.overlap}
        />

        {/* Section 2: Release to Stage Debut Time Difference */}
        <ReleaseDelaySection stats={stats.releaseDelay} />

        {/* Section 3: Character Focus Songs Matrix */}
        <FocusMatrixSection stats={stats.focusMatrix} />

        {/* Section 4: Song Version Breakdown (Full vs Short/Medley) */}
        <VersionBreakdownSection stats={stats.versionBreakdown} />

        {/* Section 5: Unperformed Songs Catalog */}
        <UnperformedSongsSection
          commissioned={stats.unperformed.commissioned}
          coversAndOther={stats.unperformed.coversAndOther}
        />

        {/* Footer Credit */}
        <Text pt="2" color="fg.subtle" fontSize="xs" textAlign="center">
          {t('sekaiSetlist.credit', {
            defaultValue: 'Song data and jackets from sekai.best / Sekai master DB.'
          })}
        </Text>
      </Stack>
    </>
  );
}
