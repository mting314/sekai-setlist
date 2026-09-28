/**
 * Share and export a prediction: a /view link (the whole prediction in the hash), plain text,
 * a JSON file and a PNG of an off-screen SetlistView. Sharing works like the-sorter's results: a
 * "Share on X" post and a clipboard copy of the text + image, never the system share sheet.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { domToBlob } from 'modern-screenshot';
import { FaXTwitter } from 'react-icons/fa6';
import { SetlistView } from '../SetlistView';
import { Box, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/styled/text';
import { useToaster } from '~/context/ToasterContext';
import { exportText, predictionEventName } from '~/utils/sekai-setlist/prediction';
import { shareLink } from '~/utils/sekai-setlist/routes';
import { MAX_SHARE_URL_LENGTH } from '~/utils/sekai-setlist/share';
import type { SekaiPrediction } from '~/types/sekai-prediction';

export interface ExportShareToolsProps {
  prediction: SekaiPrediction;
}

/** File name from the prediction or event name, keeping Japanese characters. */
export function exportFileName(p: SekaiPrediction, lang: string): string {
  const slug = (p.name || predictionEventName(p, lang) || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return slug || 'setlist-prediction';
}

/**
 * Copies text and image as one clipboard item, or just the image where that isn't supported.
 * The write has to start in the tap (Safari), so the image may still be rendering.
 */
async function copyTextAndImage(text: string, image: Promise<Blob>) {
  const textBlob = new Blob([text], { type: 'text/plain' });
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': image, 'text/plain': textBlob })
    ]);
  } catch {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
  }
}

function download(href: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  link.click();
}

/**
 * Sharing a prediction: `copyImage` copies text + PNG, `shareToX` opens an X post with the link,
 * `downloadImage` saves the PNG. Render `canvas` somewhere; it's the off-screen
 * SetlistView the image is taken from.
 */
export function useSetlistImage(prediction: SekaiPrediction, authorName = '') {
  const { t, i18n } = useTranslation();
  const { toast, dismiss } = useToaster();
  const [busy, setBusy] = useState<'copy' | 'download'>();
  const imageRef = useRef<HTMLDivElement>(null);
  const author = authorName.trim();
  const filename = exportFileName(prediction, i18n.language);
  const failed = (title: string) => toast({ title, type: 'error' });

  const shareText = () => {
    const url = shareLink(prediction);
    return [
      exportText(prediction, i18n.language),
      author && `— ${author}`,
      url.length < MAX_SHARE_URL_LENGTH && url
    ]
      .filter(Boolean)
      .join('\n\n');
  };

  const renderImage = async () => {
    if (!imageRef.current) return;
    // Jackets and icons are lazy, and this off-screen copy never scrolls into view, so they'd
    // never load and modern-screenshot would wait out its timeout for every one of them.
    for (const img of imageRef.current.querySelectorAll('img')) img.loading = 'eager';
    return domToBlob(imageRef.current, {
      type: 'image/png',
      scale: 2,
      timeout: 10_000,
      backgroundColor: window.getComputedStyle(imageRef.current).backgroundColor,
      // Jackets come from sekai.best, which allows CORS but 403s a third-party Referer.
      fetch: { requestInit: { mode: 'cors', referrerPolicy: 'no-referrer' } }
    });
  };

  // Rendering takes a few seconds (every jacket is fetched first), so say so straight away.
  const working = async (kind: 'copy' | 'download', run: () => Promise<void>) => {
    setBusy(kind);
    const id = toast({
      title: t('builder.exportingImage', { defaultValue: 'Creating image…' }),
      type: 'loading'
    });
    try {
      await run();
    } finally {
      if (id) dismiss(id);
      setBusy(undefined);
    }
  };

  const withImage = (use: (image: Blob) => void) =>
    working('download', async () => {
      try {
        const image = await renderImage();
        if (!image) throw new Error('No image to render');
        use(image);
      } catch {
        failed(t('builder.imageFailed', { defaultValue: 'Could not create the image' }));
      }
    });

  // Straight to the clipboard, no share sheet. Safari only allows the write in the tap itself,
  // so it starts at once with the image still rendering.
  const copyImage = () =>
    working('copy', async () => {
      const image = renderImage().then((blob) => blob ?? Promise.reject(new Error('No image')));
      try {
        await copyTextAndImage(shareText(), image);
        toast({
          title: t('builder.shareCopied', { defaultValue: 'Text and image copied' }),
          type: 'success'
        });
      } catch {
        failed(
          (await image.then(() => false).catch(() => true))
            ? t('builder.imageFailed', { defaultValue: 'Could not create the image' })
            : t('builder.copyFailed', { defaultValue: 'Could not copy to the clipboard' })
        );
      }
    });

  // Like the-sorter's "Share on X": a post with the prediction's name and link, not the whole
  // setlist, which wouldn't fit.
  const shareToX = () => {
    const url = shareLink(prediction);
    const text = [
      prediction.name || predictionEventName(prediction, i18n.language),
      author && `— ${author}`,
      url.length < MAX_SHARE_URL_LENGTH && url
    ]
      .filter(Boolean)
      .join('\n');
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener'
    );
  };

  const downloadImage = () =>
    withImage((image) => {
      const url = URL.createObjectURL(image);
      download(url, `${filename}.png`);
      URL.revokeObjectURL(url);
      toast({
        title: t('builder.imageDownloaded', { defaultValue: 'Image downloaded' }),
        type: 'success'
      });
    });

  const canvas = (
    // Rendered off-screen at a fixed width for the image export.
    <Box aria-hidden position="fixed" top="-10000px" left="-10000px" pointerEvents="none">
      <Box ref={imageRef} w="800px" p={8} bgColor="bg.default">
        <SetlistView prediction={prediction} authorName={author || undefined} interactive={false} />
      </Box>
    </Box>
  );

  return { copyImage, shareToX, downloadImage, exporting: !!busy, busy, canvas };
}

export function ExportShareTools({ prediction }: ExportShareToolsProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const [authorName, setAuthorName] = useState('');
  const { copyImage, shareToX, downloadImage, exporting, busy, canvas } = useSetlistImage(
    prediction,
    authorName
  );
  const filename = exportFileName(prediction, i18n.language);
  const failed = (title: string) => toast({ title, type: 'error' });

  const copyLink = async () => {
    const url = shareLink(prediction);
    if (url.length >= MAX_SHARE_URL_LENGTH) {
      toast({
        title: t('builder.linkTooLong', {
          length: url.length,
          defaultValue: `This prediction is too long for a link (${url.length} characters). Use JSON export instead.`
        }),
        type: 'error'
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t('builder.linkCopied', { defaultValue: 'Share link copied' }),
        type: 'success'
      });
    } catch {
      failed(t('builder.copyFailed', { defaultValue: 'Could not copy to the clipboard' }));
    }
  };

  const copyText = async () => {
    const author = authorName.trim();
    const text = exportText(prediction, i18n.language) + (author ? `\n\n— ${author}` : '');
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: t('builder.textCopied', { defaultValue: 'Setlist copied as text' }),
        type: 'success'
      });
    } catch {
      failed(t('builder.copyFailed', { defaultValue: 'Could not copy to the clipboard' }));
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(prediction, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    download(url, `${filename}.json`);
    URL.revokeObjectURL(url);
  };

  return (
    <Stack gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        {t('builder.exportShare', { defaultValue: 'Export & share' })}
      </Text>
      <Box borderRadius="md" borderWidth="1px" p={3}>
        <Text mb={2} fontSize="xs" fontWeight="medium">
          {t('builder.authorName', { defaultValue: 'Your name (optional)' })}
        </Text>
        <Input
          size="sm"
          value={authorName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthorName(e.target.value)}
          placeholder={t('builder.authorNamePlaceholder', {
            defaultValue: 'Shown on text and image'
          })}
          aria-label={t('builder.authorName', { defaultValue: 'Your name (optional)' })}
        />
      </Box>
      <Button size="sm" onClick={shareToX}>
        <FaXTwitter /> {t('builder.shareX', { defaultValue: 'Share on X' })}
      </Button>
      <Button size="sm" variant="outline" onClick={() => void copyImage()} disabled={exporting}>
        {busy === 'copy'
          ? t('builder.exportingImage', { defaultValue: 'Creating image…' })
          : t('builder.copyTextImage', { defaultValue: 'Copy text + image' })}
      </Button>
      <Button size="sm" variant="outline" onClick={() => void copyLink()}>
        {t('builder.copyLink', { defaultValue: 'Copy share link' })}
      </Button>
      <Button size="sm" variant="outline" onClick={() => void copyText()}>
        {t('builder.copyText', { defaultValue: 'Copy as text' })}
      </Button>
      <Button size="sm" variant="outline" onClick={downloadJson}>
        {t('builder.downloadJson', { defaultValue: 'Download JSON' })}
      </Button>
      <Button size="sm" variant="outline" onClick={() => void downloadImage()} disabled={exporting}>
        {busy === 'download'
          ? t('builder.exportingImage', { defaultValue: 'Creating image…' })
          : t('builder.downloadImage', { defaultValue: 'Download image' })}
      </Button>
      {canvas}
    </Stack>
  );
}
