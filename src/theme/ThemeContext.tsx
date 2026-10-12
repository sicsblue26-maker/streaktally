//src/theme/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightColors = {
  background: '#F8F9FB',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textMuted: '#8A8A9E',
  border: '#ECECF2',
  accent: '#4A90E2',
  success: '#34C759',
  danger: '#FF3B30',
  streak: '#FF9500',
  heatmapLevel0: '#EBEDF0',
  heatmapLevel1: '#9BE9A8',
  heatmapLevel2: '#40C463',
  heatmapLevel3: '#30A14E',
  heatmapLevel4: '#216E39',
};

const darkColors = {
  background: '#0D1117',
  card: '#161B22',
  text: '#F0F6FC',
  textMuted: '#8B949E',
  border: '#30363D',
  accent: '#58A6FF',
  success: '#3FB950',
  danger: '#F85149',
  streak: '#FFA657',
  heatmapLevel0: '#161B22',
  heatmapLevel1: '#0E4429',
  heatmapLevel2: '#006D32',
  heatmapLevel3: '#26A641',
  heatmapLevel4: '#39D353',
};

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  colors: typeof lightColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>(null!);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('@theme_mode').then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = async (next: ThemeMode) => {
    setModeState(next);
    await AsyncStorage.setItem('@theme_mode', next);
  };

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);