import type React from 'react';
import { Box, Flex, HStack } from 'styled-system/jsx';
import { Text } from '~/components/ui/styled/text';

export function StatsPanel({
  title,
  description,
  badge,
  actions,
  children
}: {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      borderColor="border.subtle"
      borderRadius="l3"
      borderWidth="1px"
      p={{ base: '3.5', md: '5' }}
      bg="bg.default"
      shadow="xs"
    >
      <Flex
        gap="2.5"
        justify="space-between"
        align={{ base: 'flex-start', sm: 'center' }}
        mb="4"
        flexWrap="wrap"
      >
        <Box>
          <HStack gap="2" flexWrap="wrap">
            <Text fontSize="lg" fontWeight="bold">
              {title}
            </Text>
            {badge}
          </HStack>
          {description && (
            <Text mt="1" color="fg.muted" fontSize="xs">
              {description}
            </Text>
          )}
        </Box>
        {actions && <HStack gap="2">{actions}</HStack>}
      </Flex>
      {children}
    </Box>
  );
}
