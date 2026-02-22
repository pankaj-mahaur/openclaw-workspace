export const theme = {
  colors: {
    primary: '#1a73e8',
    secondary: '#34a853',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#202124',
    muted: '#5f6368',
    border: '#e0e0e0',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  },
  breakpoints: {
    mobile: '375px',
    tablet: '768px',
    desktop: '1024px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
      xxxl: '32px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      bold: '700',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
};

export const responsiveStyles = {
  container: {
    padding: 20,
    maxWidth: '1200px',
    marginHorizontal: 'auto',
    width: '100%',
  },
  mobile: {
    padding: 16,
  },
  tablet: {
    padding: 24,
  },
  desktop: {
    padding: 32,
  },
};

export const mediaQueries = {
  mobile: `@media (max-width: ${theme.breakpoints.mobile})`,
  tablet: `@media (min-width: ${parseInt(theme.breakpoints.mobile) + 1}px) and (max-width: ${theme.breakpoints.tablet})`,
  desktop: `@media (min-width: ${parseInt(theme.breakpoints.tablet) + 1}px)`,
};