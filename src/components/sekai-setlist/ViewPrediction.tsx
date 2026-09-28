/**
 * A shared (`#p=` / legacy `#s=`) or saved (`?prediction=`) prediction, read-only, with actions
 * to save it, open a copy in the builder, share it as text + image and mark it once its live has
 * a setlist.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiCheckDouble, BiCopy, BiDownload, BiEdit, BiSave } from 'react-icons/bi';
import { FaXTwitter } from 'react-icons/fa6';
import { SetlistView } from './SetlistView';
import { useSetlistImage } from './builder/ExportShareTools';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/styled/text';
import { useToaster } from '~/context/ToasterContext';
import { getSekaiLive } from '~/utils/sekai-setlist/live-data';
import { getPrediction, savePrediction } from '~/utils/sekai-setlist/predictions-store';
import { builderHref, markHref, predictionParam } from '~/utils/sekai-setlist/routes';
import { decodeShare } from '~/utils/sekai-setlist/share';
import type { SekaiPrediction } from '~/types/sekai-prediction';

export function ViewPrediction() {
  const { t } = useTranslation();
  const [state, setState] = useState<{ prediction?: SekaiPrediction; savedId?: string }>();

  useEffect(() => {
    const id = predictionParam();
    const saved = id ? getPrediction(id) : undefined;
    setState(
      saved
        ? { prediction: saved, savedId: saved.id }
        : { prediction: decodeShare(window.location.hash)?.prediction }
    );
  }, []);

  if (!state) return null;
  const { prediction, savedId } = state;
  if (!prediction) {
    return (
      <Box borderRadius="md" borderWidth="1px" p={6} textAlign="center" bgColor="bg.muted">
        <Text mb={4} color="fg.muted">
          {t('view.notFound', { defaultValue: 'This link doesn’t contain a setlist prediction.' })}
        </Text>
        <Button asChild>
          <a href={builderHref()}>{t('view.buildYourOwn', { defaultValue: 'Build your own' })}</a>
        </Button>
      </Box>
    );
  }

  return (
    <SharedPrediction
      prediction={prediction}
      savedId={savedId}
      onSaved={(saved) => setState({ prediction: saved, savedId: saved.id })}
    />
  );
}

function SharedPrediction({
  prediction,
  savedId,
  onSaved
}: {
  prediction: SekaiPrediction;
  savedId?: string;
  onSaved: (saved: SekaiPrediction) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const { copyImage, shareToX, downloadImage, exporting, busy, canvas } =
    useSetlistImage(prediction);
  const save = () => {
    if (savedId) return savedId;
    const saved = savePrediction(prediction);
    onSaved(saved);
    return saved.id;
  };
  const markable = !!getSekaiLive(prediction.live)?.performances.length;

  return (
    <Stack gap={4}>
      <HStack gap={2} flexWrap="wrap">
        <Button
          variant="outline"
          disabled={!!savedId}
          onClick={() => {
            save();
            toast({
              title: t('view.saved', { defaultValue: 'Saved to your predictions' }),
              type: 'success'
            });
          }}
        >
          <BiSave />{' '}
          {savedId
            ? t('view.savedButton', { defaultValue: 'Saved' })
            : t('view.save', { defaultValue: 'Save to my predictions' })}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.assign(builderHref({ prediction: save() }))}
        >
          <BiEdit /> {t('view.edit', { defaultValue: 'Edit in the builder' })}
        </Button>
        <Button variant="outline" onClick={shareToX}>
          <FaXTwitter /> {t('builder.shareX', { defaultValue: 'Share on X' })}
        </Button>
        <Button variant="outline" disabled={exporting} onClick={() => void copyImage()}>
          <BiCopy />{' '}
          {busy === 'copy'
            ? t('builder.exportingImage', { defaultValue: 'Creating image…' })
            : t('builder.copyTextImage', { defaultValue: 'Copy text + image' })}
        </Button>
        <Button variant="outline" disabled={exporting} onClick={() => void downloadImage()}>
          <BiDownload />{' '}
          {busy === 'download'
            ? t('builder.exportingImage', { defaultValue: 'Creating image…' })
            : t('builder.downloadImage', { defaultValue: 'Download image' })}
        </Button>
        {markable && (
          <Button asChild variant="outline">
            <a
              href={
                savedId
                  ? markHref({ prediction: savedId, live: prediction.live })
                  : markHref({ share: prediction })
              }
            >
              <BiCheckDouble /> {t('game.mark', { defaultValue: 'Mark' })}
            </a>
          </Button>
        )}
      </HStack>
      <Box borderRadius="md" borderWidth="1px" p={{ base: 3, md: 6 }} bgColor="bg.default">
        <SetlistView prediction={prediction} />
      </Box>
      {canvas}
    </Stack>
  );
}
