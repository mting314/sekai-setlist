import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Text } from '~/components/ui/styled/text';
import {
  FORMAT_COLORS,
  type LiveFormat,
  type ReleaseDelayBucket,
  type UnitFormatBreakdown
} from '~/utils/sekai-setlist/stats';

/** Legend item with a colored badge dot */
export function ChartLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <HStack gap="1.5" alignItems="center">
      <Box flexShrink={0} borderRadius="full" w="2.5" h="2.5" bg={color} />
      <Text color="fg.muted" fontSize="xs">
        {label}
      </Text>
    </HStack>
  );
}

/** Stacked horizontal bar chart showing live formats per unit */
export function FormatStackedBarChart({ data }: { data: UnitFormatBreakdown[] }) {
  const { t } = useTranslation();
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const W = 800;
  const rowH = 36;
  const padL = 150;
  const padR = 45;
  const padT = 10;
  const padB = 10;
  const barH = 18;

  const maxTotal = Math.max(1, ...data.map((d) => d.total));
  const innerW = W - padL - padR;
  const H = padT + data.length * rowH + padB;

  const formats: { key: LiveFormat; label: string; color: string }[] = [
    {
      key: 'screen_2d',
      label: t('stats.format.screen2dShort', { defaultValue: '2D Screen' }),
      color: FORMAT_COLORS.screen_2d
    },
    {
      key: 'cast_3d',
      label: t('stats.format.cast3dShort', { defaultValue: '3D Cast' }),
      color: FORMAT_COLORS.cast_3d
    },
    {
      key: 'connect_live',
      label: t('stats.format.connectLiveShort', { defaultValue: 'Connect' }),
      color: FORMAT_COLORS.connect_live
    },
    {
      key: 'symphony',
      label: t('stats.format.symphonyShort', { defaultValue: 'Symphony' }),
      color: FORMAT_COLORS.symphony
    }
  ];

  return (
    <Stack gap="3" w="full">
      <Wrap gap="4" justify="flex-end" px="2">
        {formats.map((f) => (
          <ChartLegendItem key={f.key} label={f.label} color={f.color} />
        ))}
      </Wrap>
      <Box w="full" overflowX="auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ minWidth: 500, display: 'block' }}
          role="img"
          aria-label="Live performances by format and unit"
        >
          {data.map((unit, idx) => {
            const yBase = padT + idx * rowH;
            const yBar = yBase + (rowH - barH) / 2;

            // Segments calculation
            let currentX = padL;
            const segments: {
              key: LiveFormat;
              count: number;
              width: number;
              x: number;
              color: string;
            }[] = [];

            for (const f of formats) {
              const count =
                f.key === 'screen_2d'
                  ? unit.screen2d
                  : f.key === 'cast_3d'
                    ? unit.cast3d
                    : f.key === 'connect_live'
                      ? unit.connectLive
                      : unit.symphony;

              const w = (count / maxTotal) * innerW;
              if (count > 0) {
                segments.push({
                  key: f.key,
                  count,
                  width: w,
                  x: currentX,
                  color: f.color
                });
                currentX += w;
              }
            }

            return (
              <g key={unit.unitId}>
                {/* Unit Name Label */}
                <text
                  x={padL - 10}
                  y={yBase + rowH / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill="currentColor"
                  fontSize="12"
                  fontWeight="600"
                >
                  {unit.unitName}
                </text>

                {/* Background Track */}
                <rect
                  x={padL}
                  y={yBar}
                  width={innerW}
                  height={barH}
                  fill="currentColor"
                  opacity={0.06}
                  rx={4}
                />

                {/* Segments */}
                {segments.map((seg, sIdx) => {
                  const segId = `${unit.unitId}-${seg.key}`;
                  const isHovered = hoveredSegment === segId;
                  const isFirst = sIdx === 0;
                  const isLast = sIdx === segments.length - 1;

                  return (
                    <g key={seg.key}>
                      <rect
                        x={seg.x}
                        y={yBar}
                        width={Math.max(2, seg.width)}
                        height={barH}
                        fill={seg.color}
                        opacity={isHovered ? 0.9 : 0.8}
                        rx={isFirst && isLast ? 4 : isFirst ? 4 : isLast ? 4 : 0}
                        style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                        onMouseEnter={() => setHoveredSegment(segId)}
                        onMouseLeave={() => setHoveredSegment(null)}
                      >
                        <title>
                          {unit.unitName}: {seg.count}{' '}
                          {formats.find((f) => f.key === seg.key)?.label}
                        </title>
                      </rect>
                      {seg.width > 24 && (
                        <text
                          x={seg.x + seg.width / 2}
                          y={yBar + barH / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          {seg.count}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Total Count Label */}
                <text
                  x={padL + innerW + 8}
                  y={yBase + rowH / 2}
                  dominantBaseline="central"
                  fill="currentColor"
                  fontSize="11"
                  fontWeight="600"
                  opacity={0.8}
                >
                  {unit.total}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>
    </Stack>
  );
}

/** Distribution Histogram for Release-to-Debut Days */
export function ReleaseDelayHistogram({
  buckets,
  lang,
  onSelectBucket,
  selectedBucketKey
}: {
  buckets: ReleaseDelayBucket[];
  lang: string;
  onSelectBucket?: (key: string) => void;
  selectedBucketKey?: string;
}) {
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const isJa = lang.startsWith('ja');

  const W = 700;
  const H = 220;
  const padL = 35;
  const padR = 20;
  const padT = 30;
  const padB = 45;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const colW = innerW / buckets.length;
  const barW = Math.min(52, colW * 0.72);

  return (
    <Box w="full" overflowX="auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ minWidth: 460, display: 'block' }}
        role="img"
        aria-label="Song debut delay distribution"
      >
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padT + innerH * (1 - pct);
          return (
            <line
              key={i}
              x1={padL}
              x2={padL + innerW}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray={pct > 0 ? '3,3' : undefined}
            />
          );
        })}

        {/* Bars */}
        {buckets.map((b, idx) => {
          const h = (b.count / maxCount) * innerH;
          const x = padL + idx * colW + (colW - barW) / 2;
          const y = padT + innerH - h;
          const isSelected = selectedBucketKey === b.key;
          const isPreRelease = b.key === 'pre_release';
          const barColor = isPreRelease
            ? '#ec4899'
            : isSelected
              ? 'var(--colors-accent-default)'
              : '#3b82f6';

          return (
            <g
              key={b.key}
              onClick={() => onSelectBucket?.(b.key)}
              style={{ cursor: onSelectBucket ? 'pointer' : 'default' }}
            >
              {/* Background Track */}
              <rect
                x={x}
                y={padT}
                width={barW}
                height={innerH}
                fill="currentColor"
                opacity={0.04}
                rx={4}
              />

              {/* Data Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, h)}
                fill={barColor}
                opacity={isSelected ? 1 : 0.8}
                rx={4}
              >
                <title>{`${isJa ? b.labelJa : b.labelEn}: ${b.count} songs`}</title>
              </rect>

              {/* Value Label on Top */}
              <text
                x={x + barW / 2}
                y={y - 8}
                textAnchor="middle"
                fill="currentColor"
                fontSize="11"
                fontWeight="bold"
                opacity={0.9}
              >
                {b.count}
              </text>

              {/* Bottom Label */}
              <text
                x={x + barW / 2}
                y={padT + innerH + 18}
                textAnchor="middle"
                fill="currentColor"
                fontSize="10"
                fontWeight={isPreRelease ? 'bold' : 'normal'}
                opacity={isPreRelease ? 1 : 0.75}
              >
                {isPreRelease ? (isJa ? '事前披露' : '< 0d') : b.labelEn.split(' ')[0]}
              </text>
              <text
                x={x + barW / 2}
                y={padT + innerH + 30}
                textAnchor="middle"
                fill="currentColor"
                fontSize="9"
                opacity={0.5}
              >
                {b.labelEn.split(' ').slice(1).join(' ')}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}
