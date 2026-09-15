/**
 * DigiLocker-inspired Corporate & Institutional Government-Grade Color Theme
 * Primary Royal Blue (#1C3FB7), Royal Purple/Violet (#5B45E0), Crisp White & Cloud Slate (#F8FAFD)
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F8FAFD',
    backgroundElement: '#EEF2FF',
    backgroundSelected: '#E0E7FF',
    textSecondary: '#64748B',
    primary: '#1C3FB7',
    primaryLight: '#EEF2FF',
    accent: '#5B45E0',
    accentLight: '#F5F3FF',
    card: '#FFFFFF',
    cardMuted: '#F1F5F9',
    border: '#E2E8F0',
    borderLight: '#EDF2F7',
    statusVerified: '#059669',
    statusPending: '#D97706',
    statusDanger: '#DC2626',
    statusInfo: '#2563EB',
  },
  dark: {
    text: '#F8FAFC',
    background: '#0B0F19',
    backgroundElement: '#151C2E',
    backgroundSelected: '#1E293B',
    textSecondary: '#94A3B8',
    primary: '#3B82F6',
    primaryLight: '#1E293B',
    accent: '#818CF8',
    accentLight: '#282452',
    card: '#111827',
    cardMuted: '#0F172A',
    border: '#1F2937',
    borderLight: '#1E293B',
    statusVerified: '#10B981',
    statusPending: '#F59E0B',
    statusDanger: '#EF4444',
    statusInfo: '#60A5FA',
  },
} as const;

export const DmsColors = {
  // Brand specification: #6334FA purple action & deep navy
  brandPurple: '#6334FA',
  brandPurpleLight: '#F3E8FF',
  brandPurpleDark: '#4F23D6',
  deepNavy: '#0B192C',
  deepNavyMuted: '#1E293B',
  royalBlue: '#1C3FB7',
  royalBlueDark: '#122B82',
  royalBlueLight: '#EEF2FF',
  purpleAccent: '#6334FA',
  purpleAccentLight: '#F3E8FF',
  skyBlue: '#0284C7',

  // Clean Neutral Canvas
  cloudBg: '#F8FAFD',
  cardWhite: '#FFFFFF',
  cardMuted: '#F1F5F9',
  borderSlate: '#E2E8F0',
  navyText: '#0B192C',
  slateMuted: '#64748B',

  // Verification & Status Badges
  statusVerified: '#059669',
  statusVerifiedBg: '#ECFDF5',
  statusPending: '#D97706',
  statusPendingBg: '#FFFBEB',
  statusDanger: '#DC2626',
  statusDangerBg: '#FEF2F2',
  statusInfo: '#6334FA',
  statusInfoBg: '#F3E8FF',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
