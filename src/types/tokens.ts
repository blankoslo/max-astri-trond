export const tokens = {
  colors: {
    brand: {
      100: '#dcdeff',
      200: '#bfc3ff',
      300: '#959bff',
      400: '#4f59fb',
      500: '#2f3597',
      600: '#202464',
    },
    neutral: {
      100: '#d9d9d9',
      200: '#a6a6a6',
      300: '#808080',
      400: '#666666',
      500: '#4d4d4d',
      600: '#1a1a1a',
    },
    black: '#000000',
    white: '#ffffff',
    system: {
      info: '#1D4ED8',
      infoLight: '#DBEAFE',
      warning: '#e15b02',
      warningLight: '#ffdac2',
      success: '#0f8402',
      successLight: '#d4ffcf',
      error: '#bf0000',
      errorLight: '#ffcece',
    },
  },
  semantic: {
    background: {
      white: '#ffffff',
      primary: '#4f59fb',
      primaryHover: '#2f3597',
      disabled: '#d9d9d9',
    },
    text: {
      placeholder: '#666666',
      white: '#ffffff',
      black: '#000000',
      primary: '#4f59fb',
      primaryHover: '#2f3597',
      disabled: '#4d4d4d',
    },
    border: {
      default: '#d9d9d9',
      primary: '#4f59fb',
      disabled: '#a6a6a6',
    },
  },
  typography: {
    fontFamily: {
      primary: "'Inter', sans-serif",
      secondary: "'Source Serif 4', serif",
    },
    fontWeight: {
      regular: 400,
      semibold: 600,
      bold: 700,
    },
    fontSize: {
      100: '12px',
      200: '14px',
      300: '16px',
      400: '18px',
      500: '24px',
      600: '32px',
      700: '40px',
      800: '48px',
    },
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '16px',
    4: '24px',
    5: '32px',
    6: '48px',
    7: '64px',
    8: '96px',
  },
  border: {
    stroke: '1px',
    radius: {
      small: '4px',
      medium: '16px',
      full: '100px',
    },
  },
} as const;

export type ColorTokens = typeof tokens.colors;
export type SemanticTokens = typeof tokens.semantic;
export type TypographyTokens = typeof tokens.typography;
export type SpacingTokens = typeof tokens.spacing;
export type BorderTokens = typeof tokens.border;

export type TextStyle = {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
};

export const textStyles: Record<string, TextStyle> = {
  'heading-small': {
    fontFamily: tokens.typography.fontFamily.secondary,
    fontSize: tokens.typography.fontSize[600],
    fontWeight: tokens.typography.fontWeight.semibold,
    lineHeight: tokens.typography.fontSize[600],
  },
  'heading-medium': {
    fontFamily: tokens.typography.fontFamily.secondary,
    fontSize: tokens.typography.fontSize[700],
    fontWeight: tokens.typography.fontWeight.semibold,
    lineHeight: tokens.typography.fontSize[700],
  },
  'heading-large': {
    fontFamily: tokens.typography.fontFamily.secondary,
    fontSize: tokens.typography.fontSize[800],
    fontWeight: tokens.typography.fontWeight.bold,
    lineHeight: tokens.typography.fontSize[800],
  },
  'body-xsmall': {
    fontFamily: tokens.typography.fontFamily.primary,
    fontSize: tokens.typography.fontSize[200],
    fontWeight: tokens.typography.fontWeight.regular,
    lineHeight: '16px',
  },
  'body-small': {
    fontFamily: tokens.typography.fontFamily.primary,
    fontSize: tokens.typography.fontSize[300],
    fontWeight: tokens.typography.fontWeight.regular,
    lineHeight: '20px',
  },
  'body-medium': {
    fontFamily: tokens.typography.fontFamily.primary,
    fontSize: tokens.typography.fontSize[400],
    fontWeight: tokens.typography.fontWeight.regular,
    lineHeight: '24px',
  },
  'body-large': {
    fontFamily: tokens.typography.fontFamily.primary,
    fontSize: tokens.typography.fontSize[600],
    fontWeight: tokens.typography.fontWeight.regular,
    lineHeight: tokens.typography.fontSize[600],
  },
};