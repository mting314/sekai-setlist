import { FaMoon, FaSun } from 'react-icons/fa6';
import { IconButton } from '../ui/icon-button';
import { useColorModeContext } from '~/context/ColorModeContext';
import { css } from 'styled-system/css';

// Both icons are rendered and the html `dark` class (set by ColorModeProvider's inline script
// before hydration) picks one, so the server markup matches the client whatever mode is saved.
const moon = css({ display: 'none', _dark: { display: 'block' } });
const sun = css({ _dark: { display: 'none' } });

export function ColorModeToggle() {
  const { colorMode, setColorMode } = useColorModeContext();
  return (
    <IconButton
      variant="subtle"
      aria-label="Toggle Color Mode"
      onClick={() => setColorMode?.(colorMode === 'dark' ? 'light' : 'dark')}
    >
      <FaMoon className={moon} />
      <FaSun className={sun} />
    </IconButton>
  );
}
