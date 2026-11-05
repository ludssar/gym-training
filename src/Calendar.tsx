import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import {
  addDays,
  fromDateKey,
  sessionProgress,
  startOfWeek,
  toDateKey,
  workoutsForWeekday,
  type TrainingLog,
} from './log'
import type { TrainingPlan } from './types'

const WEEK_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

type Props = {
  plan: TrainingPlan
  log: TrainingLog
  selected: string
  today: string
  onSelect: (dateKey: string) => void
}

function useIsPhone() {
  const query = '(max-width: 820px)'
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return matches
}

export function Calendar({ plan, log, selected, today, onSelect }: Props) {
  const selectedDate = fromDateKey(selected)
  const isPhone = useIsPhone()
  const [expanded, setExpanded] = useState(false)
  const compact = isPhone && !expanded
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate))
  const [month, setMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )

  // Se la data selezionata cambia mese (es. "Oggi"), il calendario la segue.
  const selectedMonthKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`
  const [followedMonth, setFollowedMonth] = useState(selectedMonthKey)
  if (followedMonth !== selectedMonthKey) {
    setFollowedMonth(selectedMonthKey)
    setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }

  // In vista settimana segue la settimana del giorno selezionato.
  const selectedWeekKey = toDateKey(startOfWeek(selectedDate))
  const [followedWeek, setFollowedWeek] = useState(selectedWeekKey)
  if (followedWeek !== selectedWeekKey) {
    setFollowedWeek(selectedWeekKey)
    setWeekStart(startOfWeek(selectedDate))
  }

  const gridStart = startOfWeek(month)
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  const lastRowNeeded = days.slice(35).some((day) => day.getMonth() === month.getMonth())
  const visibleDays = compact
    ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
    : lastRowNeeded ? days : days.slice(0, 35)

  const monthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(month)
  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${weekStart.getDate()} ${weekStart.getMonth() !== weekEnd.getMonth()
    ? new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(weekStart).replace('.', '') + ' '
    : ''}– ${weekEnd.getDate()} ${new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(weekEnd).replace('.', '')}`

  const shift = (delta: number) => {
    if (compact) {
      setWeekStart((current) => addDays(current, delta * 7))
      return
    }
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  const toggleExpanded = () => {
    if (!expanded) setMonth(new Date(weekStart.getFullYear(), addDays(weekStart, 3).getMonth(), 1))
    setExpanded((current) => !current)
  }

  return (
    <section className={`calendar-card ${compact ? 'calendar-compact' : ''}`} aria-label="Calendario allenamenti">
      <div className="calendar-head">
        <button className="icon-button" onClick={() => shift(-1)} aria-label={compact ? 'Settimana precedente' : 'Mese precedente'}>
          <Icon name="chevron-left" />
        </button>
        <strong>{compact ? weekLabel : monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</strong>
        <button className="icon-button" onClick={() => shift(1)} aria-label={compact ? 'Settimana successiva' : 'Mese successivo'}>
          <Icon name="chevron-right" />
        </button>
      </div>

      <div className="calendar-grid" role="grid">
        {WEEK_LABELS.map((label, index) => (
          <span className="calendar-weekday" key={index} aria-hidden="true">{label}</span>
        ))}
        {visibleDays.map((day) => {
          const key = toDateKey(day)
          const session = log.sessions[key]
          const workout = session
            ? plan.workouts.find((item) => item.id === session.workoutId)
            : undefined
          const progress = session && workout ? sessionProgress(workout, session) : null
          const planned = workoutsForWeekday(plan, day).length > 0
          const state = session?.completedAt || (progress && progress.ratio >= 1)
            ? 'done'
            : progress && progress.done > 0
              ? 'partial'
              : planned
                ? key < today ? 'missed' : 'planned'
                : 'rest'
          const classes = [
            'calendar-day',
            `state-${state}`,
            !compact && day.getMonth() !== month.getMonth() ? 'outside' : '',
            key === today ? 'today' : '',
            key === selected ? 'selected' : '',
          ].filter(Boolean).join(' ')
          const label = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(day)
          const stateLabel = {
            done: 'allenamento completato',
            partial: 'allenamento iniziato',
            planned: 'allenamento in programma',
            missed: 'allenamento non registrato',
            rest: 'riposo',
          }[state]

          return (
            <button
              key={key}
              className={classes}
              onClick={() => onSelect(key)}
              aria-label={`${label}, ${stateLabel}`}
              aria-pressed={key === selected}
            >
              <span className="calendar-number">{day.getDate()}</span>
              <span className="calendar-mark" aria-hidden="true" />
            </button>
          )
        })}
      </div>

      {!compact && <div className="calendar-legend" aria-hidden="true">
        <span><i className="legend-done" /> Fatto</span>
        <span><i className="legend-partial" /> Iniziato</span>
        <span><i className="legend-planned" /> In programma</span>
      </div>}

      <div className="calendar-actions">
        {selected !== today && (
          <button className="text-button calendar-today" onClick={() => onSelect(today)}>
            Torna a oggi
          </button>
        )}
        {isPhone && (
          <button className="text-button calendar-toggle" onClick={toggleExpanded} aria-expanded={expanded}>
            {expanded ? 'Mostra solo la settimana' : 'Mostra tutto il mese'}
          </button>
        )}
      </div>
    </section>
  )
}
