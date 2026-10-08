import songsData from '../../../data/sekai/songs.json';
import unitsData from '../../../data/sekai/units.json';
import charactersData from '../../../data/sekai/characters.json';
import livesData from '../../../data/sekai/lives.json';
import songDetailsData from '../../../data/sekai/song-details.json';
import type {
  SekaiCharacter,
  SekaiLive,
  SekaiLiveSeries,
  SekaiSong,
  SekaiSongDetails,
  SekaiUnitMeta
} from '~/types/sekai';

export type LiveFormat = 'screen_2d' | 'cast_3d' | 'connect_live' | 'symphony';

export const FORMAT_COLORS: Record<LiveFormat, string> = {
  screen_2d: '#06b6d4', // Cyan (Virtual characters / 2D Screen)
  cast_3d: '#f97316', // Orange (Real cast on stage / 3D)
  connect_live: '#8b5cf6', // Violet (Connect Live)
  symphony: '#ec4899' // Pink (Sekai Symphony)
};

export const FORMAT_NAMES: Record<
  LiveFormat,
  { en: string; ja: string; descEn: string; descJa: string }
> = {
  screen_2d: {
    en: '2D Screen (COLORFUL LIVE)',
    ja: '2Dスクリーン (セカイライブ)',
    descEn: 'Virtual character 3DCG projection on transparent screens',
    descJa: '透明スクリーンへの3DCGキャラクター投影ライブ'
  },
  cast_3d: {
    en: '3D Cast (Thanks Fes & Fan Meeting)',
    ja: '3Dキャスト (感謝祭・ファンミ)',
    descEn: 'Voice cast performing live in real life on stage',
    descJa: '声優キャストによるリアルステージ歌唱・パフォーマンス'
  },
  connect_live: {
    en: 'Connect Live (2D Virtual)',
    ja: 'コネクトライブ (2Dバーチャル)',
    descEn: 'Real-time interactive virtual live with 3DCG character models',
    descJa: '3DCGキャラクターによるゲーム内リアルタイム参加型バーチャルライブ'
  },
  symphony: {
    en: 'Sekai Symphony',
    ja: 'セカイシンフォニー',
    descEn: 'Full orchestra concerts with Tokyo Philharmonic Orchestra',
    descJa: '東京フィルハーモニー交響楽団によるオーケストラコンサート'
  }
};

export function getLiveFormat(series: SekaiLiveSeries): LiveFormat {
  switch (series) {
    case 'thanks_festival':
    case 'fan_meeting':
      return 'cast_3d';
    case 'colorful_live':
      return 'screen_2d';
    case 'connect_live':
      return 'connect_live';
    case 'sekai_symphony':
      return 'symphony';
  }
}

export interface StatsOverviewKPIs {
  totalLives: number;
  totalSetlists: number;
  totalLiveAppearances: number;
  totalCatalogSongs: number;
  performedCatalogSongs: number;
  unperformedCatalogSongs: number;
  cast3dPerformances: number;
  screen2dPerformances: number;
  connectLivePerformances: number;
  symphonyPerformances: number;
}

export interface UnitFormatBreakdown {
  unitId: string;
  unitName: string;
  color: string;
  screen2d: number;
  cast3d: number;
  connectLive: number;
  symphony: number;
  total: number;
}

export interface FormatOverlap {
  both2dAnd3d: string[];
  screen2dOnly: string[];
  cast3dOnly: string[];
  otherFormatOnly: string[];
}

export interface ReleaseDelaySong {
  songId: string;
  title: string;
  englishName?: string;
  unitId: string;
  unitName: string;
  unitColor: string;
  commissioned: boolean;
  publishedAt: number;
  firstLiveId: string;
  firstLiveName: string;
  firstLiveSeries: SekaiLiveSeries;
  firstLiveFormat: LiveFormat;
  firstLiveDate: string; // YYYY-MM-DD
  daysToDebut: number; // can be negative for pre-release debuts
  assetbundleName: string;
}

export interface ReleaseDelayBucket {
  key: string;
  labelEn: string;
  labelJa: string;
  minDays: number;
  maxDays: number;
  count: number;
  songs: ReleaseDelaySong[];
}

export interface ReleaseDelayStats {
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  buckets: ReleaseDelayBucket[];
  fastestDebuts: ReleaseDelaySong[];
  longestWaits: ReleaseDelaySong[];
}

export interface CharacterFocusCell {
  cycle: number; // 1..7 (or 0 for World Link)
  isWorldLink?: boolean;
  songId?: string;
  title?: string;
  englishName?: string;
  assetbundleName?: string;
  eventId?: number;
  eventName?: string;
  nickname?: string;
  publishedAt?: number;
  isPerformed: boolean;
  performanceCount: number;
  total2dCount?: number;
  screen2dCount: number;
  cast3dCount: number;
  connectLiveCount?: number;
  firstLiveName?: string;
  firstLiveDate?: string;
}

export interface CharacterFocusRow {
  characterId: number;
  name: string;
  nameJa: string;
  unitId: string;
  unitName: string;
  unitColor: string;
  cycles: (CharacterFocusCell | null)[]; // 0..6 for Focus 1..7
  worldLink: CharacterFocusCell | null;
  totalSongs: number;
  performedSongs: number;
}

export interface FocusMatrixStats {
  totalFocusSongs: number;
  performedFocusSongs: number;
  unperformedFocusSongs: number;
  completionRate: number;
  cycleCompletion: { cycle: number; total: number; performed: number; percent: number }[];
  characters: CharacterFocusRow[];
}

export interface VersionBreakdownStats {
  totalPerformances: number;
  fullVersionCount: number;
  shortOrGameCount: number;
  shortVersionItems: {
    liveId: string;
    liveName: string;
    liveSeries: SekaiLiveSeries;
    liveDate: string;
    songId?: string;
    title: string;
    note: string;
  }[];
}

export interface UnperformedSongItem {
  songId: string;
  title: string;
  englishName?: string;
  units: string[];
  unitName: string;
  unitColor: string;
  commissioned: boolean;
  publishedAt?: number;
  assetbundleName: string;
  nicknames?: string[];
  eventIds?: number[];
  total2dCount: number; // screen2dCount + connectLiveCount (all virtual character performances)
  screen2dCount: number;
  cast3dCount: number;
  connectLiveCount: number;
  symphonyCount: number;
  totalAppearances: number;
  first2dLiveName?: string;
  first2dLiveDate?: string;
  first3dLiveName?: string;
  first3dLiveDate?: string;
}

export interface SekaiStatsData {
  kpis: StatsOverviewKPIs;
  formatComparison: {
    counts: {
      screen2d: number;
      cast3d: number;
      connectLive: number;
      symphony: number;
      total: number;
    };
    byUnit: UnitFormatBreakdown[];
    overlap: FormatOverlap;
  };
  releaseDelay: ReleaseDelayStats;
  focusMatrix: FocusMatrixStats;
  versionBreakdown: VersionBreakdownStats;
  unperformed: {
    total: number;
    commissioned: UnperformedSongItem[];
    coversAndOther: UnperformedSongItem[];
    allAwaiting: {
      commissioned: UnperformedSongItem[];
      coversAndOther: UnperformedSongItem[];
    };
  };
}

const byRelease = (a: UnperformedSongItem, b: UnperformedSongItem) =>
  (a.publishedAt ?? 0) - (b.publishedAt ?? 0) || Number(a.songId) - Number(b.songId);

const UNIT_WL_NICKNAME: Record<string, string> = {
  leo_need: 'wl3-1',
  more_more_jump: 'wl3-2',
  vivid_bad_squad: 'wl3-3',
  wonderlands_showtime: 'wl3-4',
  nightcord: 'wl3-5'
};

export function computeSekaiStats(): SekaiStatsData {
  const songs = songsData as unknown as SekaiSong[];
  const units = unitsData as unknown as SekaiUnitMeta[];
  const characters = charactersData as SekaiCharacter[];
  const lives = livesData as unknown as SekaiLive[];
  const details = songDetailsData as unknown as Record<string, SekaiSongDetails>;

  const songMap = new Map<string, SekaiSong>(songs.map((s) => [s.id, s]));
  const unitMap = new Map<string, SekaiUnitMeta>(units.map((u) => [u.id, u]));

  // 1. Gather all live performances
  const sortedLives = lives
    .filter((l) => l.performances.length > 0 && l.startDate)
    .toSorted((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));

  let totalSetlists = 0;
  let totalLiveAppearances = 0;
  let cast3dPerformances = 0;
  let screen2dPerformances = 0;
  let connectLivePerformances = 0;
  let symphonyPerformances = 0;

  // Track per-song live stats
  interface SongLiveTracker {
    songId: string;
    totalAppearances: number;
    screen2dCount: number;
    cast3dCount: number;
    connectLiveCount: number;
    symphonyCount: number;
    firstLive?: SekaiLive;
    first2dLive?: SekaiLive;
    first3dLive?: SekaiLive;
    lives: Set<string>;
  }

  const songTracker = new Map<string, SongLiveTracker>();

  // Version tracking
  let fullVersionCount = 0;
  let shortOrGameCount = 0;
  const shortVersionItems: VersionBreakdownStats['shortVersionItems'] = [];

  for (const live of sortedLives) {
    const fmt = getLiveFormat(live.series);
    for (const perf of live.performances) {
      totalSetlists++;
      for (const songEntry of perf.songs) {
        totalLiveAppearances++;
        if (fmt === 'cast_3d') cast3dPerformances++;
        else if (fmt === 'screen_2d') screen2dPerformances++;
        else if (fmt === 'connect_live') connectLivePerformances++;
        else if (fmt === 'symphony') symphonyPerformances++;

        // Check version note
        const note = (songEntry.note ?? '').toLowerCase();
        const isShortOrGame = note.includes('short') || note.includes('game ver');

        if (isShortOrGame) {
          shortOrGameCount++;
          shortVersionItems.push({
            liveId: live.id,
            liveName: live.name,
            liveSeries: live.series,
            liveDate: live.startDate ?? live.date,
            songId: songEntry.songId,
            title: songEntry.title,
            note: songEntry.note ?? ''
          });
        } else {
          fullVersionCount++;
        }

        if (songEntry.songId) {
          let tr = songTracker.get(songEntry.songId);
          if (!tr) {
            tr = {
              songId: songEntry.songId,
              totalAppearances: 0,
              screen2dCount: 0,
              cast3dCount: 0,
              connectLiveCount: 0,
              symphonyCount: 0,
              firstLive: live,
              first2dLive: undefined,
              first3dLive: undefined,
              lives: new Set()
            };
            songTracker.set(songEntry.songId, tr);
          }
          tr.totalAppearances++;
          tr.lives.add(live.id);
          if (fmt === 'screen_2d') {
            tr.screen2dCount++;
            if (!tr.first2dLive) tr.first2dLive = live;
          } else if (fmt === 'cast_3d') {
            tr.cast3dCount++;
            if (!tr.first3dLive) tr.first3dLive = live;
          } else if (fmt === 'connect_live') {
            tr.connectLiveCount++;
            // Connect Live is a virtual character performance (2D)
            if (!tr.first2dLive) tr.first2dLive = live;
          } else if (fmt === 'symphony') {
            tr.symphonyCount++;
          }
        }
      }
    }
  }

  const performedCatalogSongsCount = songTracker.size;
  const totalCatalogSongs = songs.length;
  const unperformedCatalogSongs = totalCatalogSongs - performedCatalogSongsCount;

  // 2. Format Overlap (2D Character vs 3D Cast)
  const both2dAnd3d: string[] = [];
  const screen2dOnly: string[] = [];
  const cast3dOnly: string[] = [];
  const otherFormatOnly: string[] = [];

  for (const [songId, tr] of songTracker.entries()) {
    // 2D includes both COLORFUL LIVE screen projection and in-game Connect Live
    const has2D = tr.screen2dCount > 0 || tr.connectLiveCount > 0;
    const has3D = tr.cast3dCount > 0;
    if (has2D && has3D) {
      both2dAnd3d.push(songId);
    } else if (has2D && !has3D) {
      screen2dOnly.push(songId);
    } else if (!has2D && has3D) {
      cast3dOnly.push(songId);
    } else {
      otherFormatOnly.push(songId);
    }
  }

  // Unit breakdown for formats
  const unitList = units.map((u) => u.id);
  const byUnit: UnitFormatBreakdown[] = unitList.map((uid) => {
    const meta = unitMap.get(uid);
    let s2d = 0;
    let c3d = 0;
    let cl = 0;
    let sym = 0;

    for (const [songId, tr] of songTracker.entries()) {
      const s = songMap.get(songId);
      if (s?.units.includes(uid as any)) {
        s2d += tr.screen2dCount;
        c3d += tr.cast3dCount;
        cl += tr.connectLiveCount;
        sym += tr.symphonyCount;
      }
    }

    return {
      unitId: uid,
      unitName: meta?.name ?? uid,
      color: meta?.color ?? '#8a8a8a',
      screen2d: s2d,
      cast3d: c3d,
      connectLive: cl,
      symphony: sym,
      total: s2d + c3d + cl + sym
    };
  });

  // 3. Release-to-stage delay stats
  const delaySongs: ReleaseDelaySong[] = [];
  for (const [songId, tr] of songTracker.entries()) {
    const s = songMap.get(songId);
    if (!s || !s.publishedAt || !tr.firstLive || !tr.firstLive.startDate) continue;

    // Use JST midnight to calculate days difference
    const debutMs = new Date(`${tr.firstLive.startDate}T00:00:00+09:00`).getTime();
    const days = Math.round((debutMs - s.publishedAt) / (1000 * 60 * 60 * 24));

    const primaryUnit = s.units[0] ?? 'other';
    const unitMeta = unitMap.get(primaryUnit);

    delaySongs.push({
      songId,
      title: s.title,
      englishName: s.englishName,
      unitId: primaryUnit,
      unitName: unitMeta?.name ?? 'Other',
      unitColor: unitMeta?.color ?? '#8a8a8a',
      commissioned: s.commissioned,
      publishedAt: s.publishedAt,
      firstLiveId: tr.firstLive.id,
      firstLiveName: tr.firstLive.name,
      firstLiveSeries: tr.firstLive.series,
      firstLiveFormat: getLiveFormat(tr.firstLive.series),
      firstLiveDate: tr.firstLive.startDate,
      daysToDebut: days,
      assetbundleName: s.assetbundleName
    });
  }

  const sortedDelaySongs = delaySongs.toSorted((a, b) => a.daysToDebut - b.daysToDebut);

  const daysValues = sortedDelaySongs.map((s) => s.daysToDebut);
  const totalDaysSum = daysValues.reduce((acc, v) => acc + v, 0);
  const averageDays = daysValues.length ? Math.round(totalDaysSum / daysValues.length) : 0;
  const medianDays = daysValues.length ? daysValues[Math.floor(daysValues.length / 2)]! : 0;
  const minDays = daysValues.length ? daysValues[0]! : 0;
  const maxDays = daysValues.length ? daysValues[daysValues.length - 1]! : 0;

  const buckets: ReleaseDelayBucket[] = [
    {
      key: 'pre_release',
      labelEn: '< 0 days (Pre-release)',
      labelJa: '事前初披露 (0日未満)',
      minDays: -9999,
      maxDays: -1,
      count: 0,
      songs: []
    },
    {
      key: 'month_1',
      labelEn: '0–30 days',
      labelJa: '0〜30日 (1ヶ月以内)',
      minDays: 0,
      maxDays: 30,
      count: 0,
      songs: []
    },
    {
      key: 'month_3',
      labelEn: '31–90 days',
      labelJa: '31〜90日 (1〜3ヶ月)',
      minDays: 31,
      maxDays: 90,
      count: 0,
      songs: []
    },
    {
      key: 'month_6',
      labelEn: '91–180 days',
      labelJa: '91〜180日 (3〜6ヶ月)',
      minDays: 91,
      maxDays: 180,
      count: 0,
      songs: []
    },
    {
      key: 'year_1',
      labelEn: '181–365 days',
      labelJa: '181〜365日 (半年〜1年)',
      minDays: 181,
      maxDays: 365,
      count: 0,
      songs: []
    },
    {
      key: 'year_2',
      labelEn: '1–2 years',
      labelJa: '1〜2年 (366〜730日)',
      minDays: 366,
      maxDays: 730,
      count: 0,
      songs: []
    },
    {
      key: 'year_more',
      labelEn: '> 2 years',
      labelJa: '2年以上 (730日超)',
      minDays: 731,
      maxDays: 99999,
      count: 0,
      songs: []
    }
  ];

  for (const s of sortedDelaySongs) {
    for (const b of buckets) {
      if (s.daysToDebut >= b.minDays && s.daysToDebut <= b.maxDays) {
        b.count++;
        b.songs.push(s);
        break;
      }
    }
  }

  const fastestDebuts = sortedDelaySongs.slice(0, 10);
  const longestWaits = sortedDelaySongs.toReversed().slice(0, 10);

  // 4. Character Focus Songs Matrix
  // Main 20 characters (IDs 1 through 20)
  const mainCharacters = characters.filter((c) => c.id <= 20);

  // Focus cycle tracking
  let totalFocusSongs = 0;
  let performedFocusSongs = 0;
  const cycleCount = 7;
  const cycleStats = Array.from({ length: cycleCount }, (_, i) => ({
    cycle: i + 1,
    total: 0,
    performed: 0,
    percent: 0
  }));

  const characterRows: CharacterFocusRow[] = [];

  for (const char of mainCharacters) {
    const charUnitMeta = char.unit ? unitMap.get(char.unit) : undefined;
    const cycles: (CharacterFocusCell | null)[] = Array.from({ length: 7 }, () => null);
    let worldLinkCell: CharacterFocusCell | null = null;
    let charTotalSongs = 0;
    let charPerfSongs = 0;

    // Scan details for events tied to this character
    for (const [sId, d] of Object.entries(details)) {
      if (!d.events) continue;
      const s = songMap.get(sId);
      for (const ev of d.events) {
        if (ev.focusCharacterId === char.id) {
          // Determine cycle from nickname (e.g. saki1 -> 1)
          const match = ev.nickname?.match(/^[a-z]+(\d+)$/i);
          const cycleNum = match ? parseInt(match[1]!, 10) : 0;
          if (cycleNum >= 1 && cycleNum <= 7) {
            const tr = songTracker.get(sId);
            const isPerf = !!tr && tr.totalAppearances > 0;

            const s2d = tr?.screen2dCount ?? 0;
            const cl = tr?.connectLiveCount ?? 0;
            const c3d = tr?.cast3dCount ?? 0;

            const cell: CharacterFocusCell = {
              cycle: cycleNum,
              songId: sId,
              title: s?.title,
              englishName: s?.englishName,
              assetbundleName: s?.assetbundleName,
              eventId: ev.id,
              eventName: ev.name,
              nickname: ev.nickname,
              publishedAt: s?.publishedAt,
              isPerformed: isPerf,
              performanceCount: tr?.totalAppearances ?? 0,
              total2dCount: s2d + cl,
              screen2dCount: s2d,
              cast3dCount: c3d,
              connectLiveCount: cl,
              firstLiveName: tr?.firstLive?.name,
              firstLiveDate: tr?.firstLive?.startDate
            };

            cycles[cycleNum - 1] = cell;
            charTotalSongs++;
            totalFocusSongs++;
            cycleStats[cycleNum - 1]!.total++;

            if (isPerf) {
              charPerfSongs++;
              performedFocusSongs++;
              cycleStats[cycleNum - 1]!.performed++;
            }
          }
        } else if (char.unit && ev.nickname === UNIT_WL_NICKNAME[char.unit]) {
          // World link event for this unit
          const tr = songTracker.get(sId);
          const isPerf = !!tr && tr.totalAppearances > 0;
          const s2d = tr?.screen2dCount ?? 0;
          const cl = tr?.connectLiveCount ?? 0;
          const c3d = tr?.cast3dCount ?? 0;

          worldLinkCell = {
            cycle: 0,
            isWorldLink: true,
            songId: sId,
            title: s?.title,
            englishName: s?.englishName,
            assetbundleName: s?.assetbundleName,
            eventId: ev.id,
            eventName: ev.name,
            nickname: ev.nickname,
            publishedAt: s?.publishedAt,
            isPerformed: isPerf,
            performanceCount: tr?.totalAppearances ?? 0,
            total2dCount: s2d + cl,
            screen2dCount: s2d,
            cast3dCount: c3d,
            connectLiveCount: cl,
            firstLiveName: tr?.firstLive?.name,
            firstLiveDate: tr?.firstLive?.startDate
          };
        }
      }
    }

    characterRows.push({
      characterId: char.id,
      name: char.name,
      nameJa: char.nameJa,
      unitId: char.unit ?? 'other',
      unitName: charUnitMeta?.name ?? 'Other',
      unitColor: charUnitMeta?.color ?? '#8a8a8a',
      cycles,
      worldLink: worldLinkCell,
      totalSongs: charTotalSongs,
      performedSongs: charPerfSongs
    });
  }

  for (const c of cycleStats) {
    c.percent = c.total > 0 ? Math.round((c.performed / c.total) * 100) : 0;
  }

  // 5. Unperformed songs
  const unperformedCommissioned: UnperformedSongItem[] = [];
  const unperformedCovers: UnperformedSongItem[] = [];
  const allAwaitingCommissioned: UnperformedSongItem[] = [];
  const allAwaitingCovers: UnperformedSongItem[] = [];

  for (const song of songs) {
    const tr = songTracker.get(song.id);
    const screen2dCount = tr?.screen2dCount ?? 0;
    const cast3dCount = tr?.cast3dCount ?? 0;
    const connectLiveCount = tr?.connectLiveCount ?? 0;
    const symphonyCount = tr?.symphonyCount ?? 0;
    const totalAppearances = tr?.totalAppearances ?? 0;
    const total2dCount = screen2dCount + connectLiveCount;

    const primaryUnit = song.units[0] ?? 'other';
    const uMeta = unitMap.get(primaryUnit);
    const item: UnperformedSongItem = {
      songId: song.id,
      title: song.title,
      englishName: song.englishName,
      units: song.units,
      unitName: uMeta?.name ?? 'Other',
      unitColor: uMeta?.color ?? '#8a8a8a',
      commissioned: song.commissioned,
      publishedAt: song.publishedAt,
      assetbundleName: song.assetbundleName,
      nicknames: song.nicknames,
      eventIds: song.eventIds,
      total2dCount,
      screen2dCount,
      cast3dCount,
      connectLiveCount,
      symphonyCount,
      totalAppearances,
      first2dLiveName: tr?.first2dLive?.name,
      first2dLiveDate: tr?.first2dLive?.startDate,
      first3dLiveName: tr?.first3dLive?.name,
      first3dLiveDate: tr?.first3dLive?.startDate
    };

    // 0 appearances anywhere
    if (totalAppearances === 0) {
      if (song.commissioned) {
        unperformedCommissioned.push(item);
      } else {
        unperformedCovers.push(item);
      }
    }

    // Awaiting 2D or 3D debut (i.e. has not performed in both formats)
    if (total2dCount === 0 || cast3dCount === 0) {
      if (song.commissioned) {
        allAwaitingCommissioned.push(item);
      } else {
        allAwaitingCovers.push(item);
      }
    }
  }

  const sortedCommissioned = unperformedCommissioned.toSorted(byRelease);
  const sortedCovers = unperformedCovers.toSorted(byRelease);
  const sortedAllAwaitingCommissioned = allAwaitingCommissioned.toSorted(byRelease);
  const sortedAllAwaitingCovers = allAwaitingCovers.toSorted(byRelease);

  return {
    kpis: {
      totalLives: lives.length,
      totalSetlists,
      totalLiveAppearances,
      totalCatalogSongs,
      performedCatalogSongs: performedCatalogSongsCount,
      unperformedCatalogSongs,
      cast3dPerformances,
      screen2dPerformances,
      connectLivePerformances,
      symphonyPerformances
    },
    formatComparison: {
      counts: {
        screen2d: screen2dPerformances,
        cast3d: cast3dPerformances,
        connectLive: connectLivePerformances,
        symphony: symphonyPerformances,
        total: totalLiveAppearances
      },
      byUnit,
      overlap: {
        both2dAnd3d,
        screen2dOnly,
        cast3dOnly,
        otherFormatOnly
      }
    },
    releaseDelay: {
      averageDays,
      medianDays,
      minDays,
      maxDays,
      buckets,
      fastestDebuts,
      longestWaits
    },
    focusMatrix: {
      totalFocusSongs,
      performedFocusSongs,
      unperformedFocusSongs: totalFocusSongs - performedFocusSongs,
      completionRate:
        totalFocusSongs > 0 ? Math.round((performedFocusSongs / totalFocusSongs) * 100) : 0,
      cycleCompletion: cycleStats,
      characters: characterRows
    },
    versionBreakdown: {
      totalPerformances: totalLiveAppearances,
      fullVersionCount,
      shortOrGameCount,
      shortVersionItems
    },
    unperformed: {
      total: sortedCommissioned.length + sortedCovers.length,
      commissioned: sortedCommissioned,
      coversAndOther: sortedCovers,
      allAwaiting: {
        commissioned: sortedAllAwaitingCommissioned,
        coversAndOther: sortedAllAwaitingCovers
      }
    }
  };
}
