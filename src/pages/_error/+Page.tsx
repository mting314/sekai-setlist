import { useTranslation } from 'react-i18next';
import { Center, Stack } from 'styled-system/jsx';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { homeHref } from '~/utils/sekai-setlist/routes';

export function Page() {
  const { t } = useTranslation();
  return (
    <Center minH="60vh">
      <Stack alignItems="center">
        <Text>{t('error_page.not_found', { defaultValue: "This page doesn't exist." })}</Text>
        <Link href={homeHref()}>
          {t('error_page.home', { defaultValue: 'Back to predictions' })}
        </Link>
      </Stack>
    </Center>
  );
}
