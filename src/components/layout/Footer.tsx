import { useTranslation } from 'react-i18next';
import { Link } from '../ui/link';
import { Text } from '../ui/text';
import { Version } from '../utils/Version';
import { Stack, Wrap } from 'styled-system/jsx';

export function Footer() {
  const { t } = useTranslation();
  return (
    <Stack gap="1" justifyContent="center" w="full" p="4" textAlign="center" bgColor="bg.muted">
      <Wrap gap="1" justifyContent="center" w="full">
        <Text>{t('footer.fan_made')}</Text>
      </Wrap>
      <Wrap gap="1" justifyContent="center" alignItems="center" w="full" fontSize="sm">
        <Link href="https://github.com/mting314/sekai-setlist" target="_blank">
          GitHub
        </Link>
        <Text color="fg.muted">·</Text>
        <Text color="fg.muted">
          {t('footer.based_on')}{' '}
          <Link href="https://github.com/hamproductions/the-sorter" target="_blank">
            the-sorter
          </Link>{' '}
          (ハムP)
        </Text>
        <Text color="fg.muted">·</Text>
        <Version />
      </Wrap>
    </Stack>
  );
}
