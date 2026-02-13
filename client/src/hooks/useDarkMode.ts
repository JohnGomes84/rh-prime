import { useEffect, useState } from 'react';

/**
 * Hook para gerenciar dark mode
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    // Verificar preferência salva ou preferência do sistema
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(isDark));
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggle = () => setIsDark(!isDark);

  return { isDark, toggle };
}
