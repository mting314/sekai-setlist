import { describe, expect, it } from 'vitest';
import { parseLivePage, parseSongText, parseStartDate, plainText } from './live-wikitext';

const TABLE_PAGE = `{{Live
|title = {{PAGENAME}}
|date = January 28-30, 2022
|venue = Makuhari Messe<br>Chiba
}}
{{jp|'''{{PAGENAME}}'''|プロジェクトセカイ COLORFUL LIVE 1st -Link-}} was a live.

==Setlist==
<small>'''Note:''' The setlist was the same on all three days.</small>
{| class="wikitable"
! scope="col" width="6" |№
! scope="col" |Song
! scope="col" |Producer(s)
! scope="col" |Singer(s)
|-
|01
|[[needLe]]
|DECO*27
|[[Hatsune Miku]], [[Leo/need]]
|-
|02
|{{jp|[[From Tokyo]]|フロムトーキョー}}
|Natsuhiro Takaaki
||[[Hatsune Miku]], [[Leo/need]]
|-
|colspan="6" style="background-color:#C0C0C0" |'''Intermission'''
|-
|03
|New Landscape<ref>This is [[Azusawa Kohane|Kohane]]'s BGM</ref>
|Sadaki Naoe
|Instrumental
|-
! colspan="6" |Encore
|-
|04
|{{jp|[[SEKAI (song)|SEKAI]]|セカイ}} (Short ver.)
|DECO*27, kemu
|[[Hatsune Miku]], [[Hoshino Ichika]]
|}

==Gallery==
|99
|[[Not A Setlist]]
`;

const TABBER_PAGE = `==Setlists==
<tabber>
Daytime Performance=
{| class="article-table"
|-
|01
|[[Journey]]
|DECO*27
|[[VIRTUAL SINGER]]
|}
|-|
Nighttime Performance=
{| class="article-table"
|-
|01
|[[NEO]]
|JIN
|[[VIRTUAL SINGER]]
|}
</tabber>
==Merchandise==`;

const LIST_PAGE = `==Setlists==
===Day 1===
#[[Keitai Renwa]]
#[[Bug]] ([[Kagamine Rin|Rin]] & [[Kagamine Len|Len]] ver.)

===Day 2===
=====<font color=#FFBE5E>Day Performance</font>=====
#[[Idol Shin'eitai]]
====<font color=#717BDA>Night Performance</font>====
#[[Ryuusei no Pulse]]
==Merchandise==
TBA`;

describe('plainText', () => {
  it('flattens links, jp and interwiki templates, refs and markup', () => {
    expect(plainText("'''[[Leo/need]]''' <small>(x)</small>")).toBe('Leo/need (x)');
    expect(plainText('{{jp|[[Cinema]]|シネマ}}')).toBe('Cinema');
    expect(plainText('{{IW|ensemble-stars|Jun Sazanami|Sazanami Jun}}')).toBe('Sazanami Jun');
    expect(plainText('A<ref>[[B|b]]</ref> [https://x.test Site]')).toBe('A Site');
  });
});

describe('parseSongText', () => {
  it('reads links, JP titles and trailing notes', () => {
    expect(parseSongText('{{jp|[[SEKAI (song)|SEKAI]]|セカイ}} (Short ver.)')).toEqual({
      link: 'SEKAI (song)',
      title: 'SEKAI',
      jp: 'セカイ',
      note: '(Short ver.)'
    });
    expect(parseSongText('[[Bug]] ([[Kagamine Rin|Rin]] ver.)')).toEqual({
      link: 'Bug',
      title: 'Bug',
      note: '(Rin ver.)'
    });
  });
  it('keeps unlinked and interwiki songs by title only', () => {
    expect(parseSongText('Traits<ref>[[Azusawa Kohane|Kohane]]</ref>')).toEqual({
      title: 'Traits'
    });
    expect(parseSongText('{{IW|ensemble-stars|Brilliant Smile (Song)|Brilliant Smile}}')).toEqual({
      title: 'Brilliant Smile'
    });
  });
});

describe('parseLivePage', () => {
  it('parses a wikitable setlist with infobox, notes and dividers', () => {
    const page = parseLivePage(TABLE_PAGE);
    expect(page.nameJa).toBe('プロジェクトセカイ COLORFUL LIVE 1st -Link-');
    expect(page.date).toBe('January 28-30, 2022');
    expect(page.venue).toBe('Makuhari Messe / Chiba');
    expect(page.notes).toEqual(['Note: The setlist was the same on all three days.']);
    expect(page.performances).toHaveLength(1);
    const [perf] = page.performances;
    expect(perf.name).toBe('');
    expect(perf.songs.map((s) => s.title)).toEqual([
      'needLe',
      'From Tokyo',
      'New Landscape',
      'SEKAI'
    ]);
    expect(perf.songs[0].performers).toEqual(['Hatsune Miku', 'Leo/need']);
    expect(perf.songs[1]).toMatchObject({
      jp: 'フロムトーキョー',
      performers: ['Hatsune Miku', 'Leo/need']
    });
    expect(perf.songs[2].link).toBeUndefined();
    expect(perf.markers).toEqual([
      { at: 2, label: 'Intermission' },
      { at: 3, label: 'Encore' }
    ]);
  });

  it('splits tabber tabs into separate performances', () => {
    const page = parseLivePage(TABBER_PAGE);
    expect(page.performances.map((p) => [p.name, p.songs[0].title])).toEqual([
      ['Daytime Performance', 'Journey'],
      ['Nighttime Performance', 'NEO']
    ]);
  });

  it('names list setlists by their heading path, even with uneven heading levels', () => {
    const page = parseLivePage(LIST_PAGE);
    expect(page.performances.map((p) => [p.name, p.songs.map((s) => s.title)])).toEqual([
      ['Day 1', ['Keitai Renwa', 'Bug']],
      ['Day 2 · Day Performance', ["Idol Shin'eitai"]],
      ['Day 2 · Night Performance', ['Ryuusei no Pulse']]
    ]);
    expect(page.performances[0].songs[1].note).toBe('(Rin & Len ver.)');
    expect(page.notes).toEqual([]);
  });

  it('returns no performances for an upcoming live', () => {
    expect(parseLivePage('==Setlist==\nTBA\n==Gallery==').performances).toEqual([]);
  });
});

describe('parseStartDate', () => {
  it('takes the first date in the wiki string', () => {
    expect(parseStartDate('January 28-30, 2022')).toBe('2022-01-28');
    expect(parseStartDate('December 25-27, 2026 (Osaka) / February 26-28, 2027 (Tokyo)')).toBe(
      '2026-12-25'
    );
    expect(parseStartDate('23 February 2025')).toBe('2025-02-23');
    expect(parseStartDate('TBA')).toBeUndefined();
  });
});
