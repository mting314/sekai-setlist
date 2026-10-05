import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiLinkExternal } from 'react-icons/bi';
import { Box, HStack, Stack, styled } from 'styled-system/jsx';
import { Badge } from '~/components/ui/styled/badge';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/styled/text';
import { NicknameChip } from './NicknameChips';
import { CharacterIcons, UnitBadge } from '../SongMeta';
import { sekaiCharacterName } from '~/utils/sekai-setlist/catalog';
import { sekaiBestEventUrl } from '~/utils/sekai-setlist/song-events';
import type { SekaiSongEvent } from '~/types/sekai';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const isoDate = (ms: number) => new Date(ms + JST_OFFSET_MS).toISOString().slice(0, 10);

const eventName = (e: SekaiSongEvent, lang: string) =>
  lang.startsWith('en') ? (e.nameEn ?? e.name) : e.name;

const BannerLink = styled('a', {
  base: {
    display: 'block',
    flexShrink: 0,
    borderColor: 'border.subtle',
    borderRadius: 'sm',
    borderWidth: '1px',
    w: { base: 'full', sm: '180px' },
    maxW: { base: '320px', sm: '180px' },
    overflow: 'hidden',
    transition: 'transform 0.15s, opacity 0.15s',
    _hover: { transform: 'scale(1.02)', opacity: 0.9 }
  }
});

/**
 * Rich event card for a song's commissioning in-game event.
 * Displays the event banner art, type, nickname chip, unit, dates, focus character,
 * and external links directly to the event view on sekai.best.
 */
export function SongEventCard({ event, songId }: { event: SekaiSongEvent; songId: string }) {
  const { t, i18n } = useTranslation();
  const [broken, setBroken] = useState(false);
  const lang = i18n.language;
  const url = sekaiBestEventUrl(event.id);
  const primaryName = eventName(event, lang);
  const secondaryName = lang.startsWith('en')
    ? event.name !== primaryName
      ? event.name
      : undefined
    : event.nameEn && event.nameEn !== event.name
      ? event.nameEn
      : undefined;

  const eventTypeLabel =
    event.type === 'world_bloom'
      ? t('songInfo.worldLinkSong', { defaultValue: 'World Link event song' })
      : event.type === 'cheerful_carnival'
        ? t('songInfo.cheerfulCarnivalSong', { defaultValue: 'Cheerful Carnival event song' })
        : t('songInfo.eventSong', { defaultValue: 'Event song' });

  const datesLabel = event.endedAt
    ? `${isoDate(event.startedAt)} – ${isoDate(event.endedAt)}`
    : isoDate(event.startedAt);

  const focusCharaName = event.focusCharacterId
    ? sekaiCharacterName(event.focusCharacterId, lang)
    : event.focusCharacter;

  const showBanner = !!event.bannerUrl && !broken;

  return (
    <Box
      data-song-event={event.id}
      borderColor="border.default"
      borderRadius="md"
      borderWidth="1px"
      p={3}
      bgColor="bg.subtle"
      overflow="hidden"
    >
      <Stack
        gap={{ base: 3, sm: 3.5 }}
        direction={{ base: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
      >
        {showBanner && (
          <BannerLink
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={t('songInfo.viewOnSekaiBest', { defaultValue: 'View on sekai.best' })}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={event.bannerUrl}
              alt={primaryName}
              width={488}
              height={208}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '488 / 208',
                display: 'block',
                objectFit: 'cover'
              }}
            />
          </BannerLink>
        )}

        <Stack flex={1} gap={1.5} minW={0}>
          <HStack gap={1.5} alignItems="center" flexWrap="wrap">
            <Badge variant="subtle" size="sm" fontSize="2xs">
              {eventTypeLabel}
            </Badge>
            {event.nickname && (
              <NicknameChip nickname={event.nickname} songId={songId} eventId={event.id} />
            )}
            {event.unit && <UnitBadge unit={event.unit} link />}
            <Box ml="auto">
              <Button asChild size="xs" variant="ghost" h="auto" p={1}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('songInfo.viewOnSekaiBest', { defaultValue: 'View on sekai.best' })}
                  onClick={(e) => e.stopPropagation()}
                >
                  <HStack gap={1} fontSize="xs">
                    <span>sekai.best</span>
                    <BiLinkExternal size={12} />
                  </HStack>
                </a>
              </Button>
            </Box>
          </HStack>

          <Stack gap={0} minW={0}>
            <Text fontSize="sm" fontWeight="bold" lineHeight="1.3">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={(e) => e.stopPropagation()}
              >
                {primaryName}
              </a>
            </Text>
            {secondaryName && (
              <Text color="fg.muted" fontSize="xs" lineHeight="1.3">
                {secondaryName}
              </Text>
            )}
          </Stack>

          <HStack gap={2} alignItems="center" color="fg.muted" fontSize="xs" flexWrap="wrap">
            <Text title={t('songInfo.eventPeriod', { defaultValue: 'Event period' })}>
              {datesLabel}
            </Text>
            {event.focusCharacterId && (
              <HStack gap={1} alignItems="center">
                <Text color="fg.subtle">·</Text>
                <CharacterIcons characters={[event.focusCharacterId]} size={16} />
                <Text>{focusCharaName}</Text>
              </HStack>
            )}
          </HStack>
        </Stack>
      </Stack>
    </Box>
  );
}
