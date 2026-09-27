import { useTranslation } from 'react-i18next';
import { Center, Stack } from 'styled-system/jsx';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/styled/text';
import { homeHref } from '~/utils/sekai-setlist/routes';

/** In-page "not found" for a dynamic route with an unknown id. */
export function NotFound() {
  const { t } = useTranslation();
  return (
    <Center minH="60vh">
      <Stack alignItems="center">
        <Text>{t('error_page.not_found', { defaultValue: "This page doesn't exist." })}</Text>
        <Link href={homeHref()}>{t('error_page.home', { defaultValue: 'Back to home' })}</Link>
      </Stack>
    </Center>
  );
}
