import { Moon, SunMedium } from 'lucide-react'
import clsx from 'clsx'
import { useThemeStore } from '../../stores/themeStore'

export default function ThemeToggle({ className = '' }) {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={clsx(
        'inline-flex items-center gap-2 rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-slate-300 hover:bg-surface-2 transition-colors',
        className
      )}
      title={isDark ? 'Mudar para modo diurno' : 'Mudar para modo noturno'}
      aria-label={isDark ? 'Mudar para modo diurno' : 'Mudar para modo noturno'}
    >
      {isDark ? <SunMedium className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      <span>{isDark ? 'Diurno' : 'Noturno'}</span>
    </button>
  )
}
