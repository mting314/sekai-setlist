/**
 * A shared (`#p=` / legacy `#s=`) or saved (`?prediction=`) prediction, read-only, with actions
 * to save it, open a copy in the builder and mark it once its live has a setlist.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiCheckDouble, BiEdit, BiSave } from 'react-icons/bi';
import { SetlistView } from './SetlistView';
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
  const { toast } = useToaster();
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

  const save = () => {
    if (savedId) return savedId;
    const saved = savePrediction(prediction);
    setState({ prediction: saved, savedId: saved.id });
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
    </Stack>
  );
}
