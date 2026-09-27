import { useTranslation } from 'react-i18next';
import { Fragment } from 'react';
import { Helmet } from 'react-helmet-async';
import { VERSION } from '../../version';

export function Metadata(props: { title?: string; helmet?: boolean }) {
  const { t } = useTranslation();
  const siteName = t('site_name', { defaultValue: 'Sekai Setlist Predictions' });
  const title = props.title ?? t('title', { defaultValue: 'Project Sekai Setlist Predictions' });
  const description = t('description', {
    defaultValue:
      'Predict Project Sekai live setlists, share them with a link and mark them against what was performed.'
  });
  const url = 'https://mting314.github.io/sekai-setlist/';
  const Wrapper = props.helmet ? Helmet : Fragment;

  return (
    <Wrapper>
      <meta data-rh="true" name="viewport" content="width=device-width, initial-scale=1.0" />

      <title>{title}</title>
      <meta data-rh="true" property="og:title" content={title} />
      <meta data-rh="true" name="twitter:title" content={title} />

      <meta data-rh="true" property="og:site_name" content={siteName} />

      <link data-rh="true" rel="canonical" href={url} />
      <meta data-rh="true" property="og:url" content={url} />

      <meta data-rh="true" property="og:description" content={description} />
      <meta data-rh="true" name="description" content={description} />
      <meta data-rh="true" name="twitter:description" content={description} />

      <meta data-rh="true" name="version" content={VERSION} />
    </Wrapper>
  );
}
