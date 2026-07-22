import { darkTheme } from '../context/ThemeContext';

/**
 * Legacy static theme export — re-exports darkTheme from ThemeContext.js.
 * For dynamic dark/light support in new components, always use useTheme() from ThemeContext.
 */
export const theme = darkTheme;
export default darkTheme;
