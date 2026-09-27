/**
 * Share and export a prediction: a /view link (the whole prediction in the hash), plain text,
 * a JSON file and a PNG of an off-screen SetlistView.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { domToPng } from 'modern-screenshot';
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

function download(href: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  link.click();
}

export function ExportShareTools({ prediction }: ExportShareToolsProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const [authorName, setAuthorName] = useState('');
  const [exporting, setExporting] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
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

  const downloadImage = async () => {
    if (!imageRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await domToPng(imageRef.current, {
        scale: 2,
        backgroundColor: window.getComputedStyle(imageRef.current).backgroundColor,
        // Jackets come from sekai.best, which allows CORS but 403s a third-party Referer.
        fetch: { requestInit: { mode: 'cors', referrerPolicy: 'no-referrer' } }
      });
      download(dataUrl, `${filename}.png`);
      toast({
        title: t('builder.imageDownloaded', { defaultValue: 'Image downloaded' }),
        type: 'success'
      });
    } catch {
      failed(t('builder.imageFailed', { defaultValue: 'Could not create the image' }));
    } finally {
      setExporting(false);
    }
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
      <Button size="sm" onClick={() => void copyLink()}>
        {t('builder.copyLink', { defaultValue: 'Copy share link' })}
      </Button>
      <Button size="sm" variant="outline" onClick={() => void copyText()}>
        {t('builder.copyText', { defaultValue: 'Copy as text' })}
      </Button>
      <Button size="sm" variant="outline" onClick={downloadJson}>
        {t('builder.downloadJson', { defaultValue: 'Download JSON' })}
      </Button>
      <Button size="sm" variant="outline" onClick={() => void downloadImage()} disabled={exporting}>
        {exporting
          ? t('builder.exportingImage', { defaultValue: 'Creating image…' })
          : t('builder.downloadImage', { defaultValue: 'Download image' })}
      </Button>

      {/* Rendered off-screen at a fixed width for the image export. */}
      <Box aria-hidden position="fixed" top="-10000px" left="-10000px" pointerEvents="none">
        <Box ref={imageRef} w="800px" p={8} bgColor="bg.default">
          <SetlistView prediction={prediction} authorName={authorName.trim() || undefined} />
        </Box>
      </Box>
    </Stack>
  );
}
