/**
 * "222 after dark" — the single design-token module.
 *
 * Dark-first sports-broadcast direction: the score is the hero on a near-black
 * stage. One signature electric-green accent owns the LIVE state and every
 * interactive highlight; amber carries odds/betting info; red is semantic
 * errors only. Every touched file imports from here — no raw hex elsewhere.
 */
import type { TextStyle } from 'react-native';
import { DarkTheme } from '@react-navigation/native';

export const colors = {
  // Stage
  background: '#0B0E14',
  surface: '#111826',
  surfaceElevated: '#1A2334',
  border: '#232D40',
  borderSubtle: '#18202F',
  scrim: 'rgba(2, 6, 12, 0.66)',

  // Text
  textPrimary: '#F2F5FA',
  textSecondary: '#9AA6BC',
  textTertiary: '#5E6A80',

  // Signature accent — LIVE state + interactive highlights
  live: '#00E676',
  liveBright: '#6BFFA8',
  liveDim: 'rgba(0, 230, 118, 0.14)',
  onAccent: '#041008',

  // Secondary accent — odds / betting info
  odds: '#FFB454',
  oddsDim: 'rgba(255, 180, 84, 0.12)',

  // Semantic errors
  danger: '#FF4D5E',
  dangerDim: 'rgba(255, 77, 94, 0.14)',
} as const;

/** 4pt spacing grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

const heroScore: TextStyle = {
  fontSize: 40,
  lineHeight: 44,
  fontWeight: '900',
  fontVariant: ['tabular-nums'],
  letterSpacing: -0.5,
};

const teamAbbr: TextStyle = {
  fontSize: 17,
  fontWeight: '700',
  letterSpacing: 0.2,
};

const sectionHeader: TextStyle = {
  fontSize: 12,
  fontWeight: '800',
  letterSpacing: 1.6,
  textTransform: 'uppercase',
};

const chip: TextStyle = {
  fontSize: 11,
  fontWeight: '800',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
};

const odds: TextStyle = {
  fontSize: 12,
  fontWeight: '600',
  fontVariant: ['tabular-nums'],
};

const dateLine: TextStyle = {
  fontSize: 12,
  fontWeight: '700',
  letterSpacing: 1.8,
  textTransform: 'uppercase',
};

const headline: TextStyle = {
  fontSize: 20,
  lineHeight: 26,
  fontWeight: '800',
};

const body: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
  fontWeight: '500',
};

const small: TextStyle = {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '500',
  letterSpacing: 0.3,
};

/** Named text styles — spread into component StyleSheet entries. */
export const type = {
  heroScore,
  teamAbbr,
  sectionHeader,
  chip,
  odds,
  dateLine,
  headline,
  body,
  small,
} as const;

/** Navigation shell theme so system surfaces match the broadcast stage. */
export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.live,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.odds,
  },
};
