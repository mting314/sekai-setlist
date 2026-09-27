import { join } from 'path-browserify';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiMenu, BiX } from 'react-icons/bi';
import { Box, Container, HStack, Stack } from 'styled-system/jsx';
import { ColorModeToggle } from '~/components/layout/ColorModeToggle';
import { Footer } from '~/components/layout/Footer';
import { LanguageToggle } from '~/components/layout/LanguageToggle';
import { Drawer } from '~/components/ui/drawer';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';

// `also`: other sections that highlight the item (the builder and marking belong to Predict).
const NAV: { path: string; key: string; exact: boolean; also?: string[] }[] = [
  { path: '/', key: 'home', exact: true },
  { path: '/lives', key: 'lives', exact: false },
  { path: '/songs', key: 'songs', exact: false },
  { path: '/me', key: 'me', exact: false },
  { path: '/predict', key: 'predict', exact: false, also: ['/builder', '/mark'] }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState(import.meta.env.BASE_URL);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, [children]);

  const matches = (path: string, exact: boolean) => {
    const full = join(import.meta.env.BASE_URL, path);
    return exact
      ? currentPath === full || currentPath === full + '/'
      : currentPath.startsWith(full);
  };
  const isActive = (path: string, exact: boolean, also: string[] = []) =>
    matches(path, exact) || also.some((p) => matches(p, false)) ? true : undefined;

  function NavLinks() {
    return (
      <>
        {NAV.map(({ path, key, exact, also }) => (
          <Link
            key={path}
            href={join(import.meta.env.BASE_URL, path)}
            data-active={isActive(path, exact, also)}
            onClick={() => setIsDrawerOpen(false)}
            _active={{ fontWeight: 'bold' }}
          >
            {t(`navigation.${key}`)}
          </Link>
        ))}
      </>
    );
  }

  return (
    <Stack position="relative" w="full" minH="100vh" bgColor="bg.default">
      <Container zIndex="1" position="relative" flex={1} w="full" py={4} px={4}>
        <Stack>
          <HStack justifyContent="space-between" alignItems="center" w="full">
            {/* Desktop Navigation */}
            <HStack hideBelow="md">
              <NavLinks />
            </HStack>

            {/* Mobile Navigation Toggle */}
            <Box hideFrom="md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Open Menu"
              >
                <BiMenu size={24} />
              </Button>
            </Box>

            <HStack hideBelow="md" justifySelf="flex-end">
              <LanguageToggle />
              <ColorModeToggle />
            </HStack>
          </HStack>
          {children}
        </Stack>
      </Container>
      <Footer />

      {/* Mobile Navigation Drawer */}
      <Drawer.Root open={isDrawerOpen} onOpenChange={(e) => setIsDrawerOpen(e.open)}>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <HStack justifyContent="space-between" alignItems="center" w="full">
                <Drawer.Title>{t('common.menu', { defaultValue: 'Menu' })}</Drawer.Title>
                <Drawer.CloseTrigger asChild>
                  <IconButton variant="ghost" size="sm">
                    <BiX size={24} />
                  </IconButton>
                </Drawer.CloseTrigger>
              </HStack>
            </Drawer.Header>
            <Drawer.Body>
              <Stack gap={4}>
                <NavLinks />
              </Stack>
            </Drawer.Body>
            <Drawer.Footer>
              <HStack justifyContent="space-between" w="full">
                <LanguageToggle />
                <ColorModeToggle />
              </HStack>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </Stack>
  );
}
