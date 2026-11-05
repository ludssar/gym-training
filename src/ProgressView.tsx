import { useState } from 'react'
import { Icon, type IconName } from './Icon'
import {
  addDays,
  describeSet,
  exerciseTrends,
  formatKg,
  formatShortDate,
  fromDateKey,
  toDateKey,
  weeklyVolume,
  type ExerciseTrend,
  type TrainingLog,
  type TrendStatus,
} from './log'

type Filter = 'all' | 'up' | 'stuck' | 'down'

const STATUS: Record<TrendStatus, { label: string; icon: IconName }> = {
  up: { label: 'In progresso', icon: 'trend-up' },
  stable: { label: 'Stabile', icon: 'trend-flat' },
  stall: { label: 'Fermo', icon: 'pause' },
  down: { label: 'In calo', icon: 'trend-down' },
  new: { label: 'Servono più dati', icon: 'plus' },
}

const STATUS_ORDER: TrendStatus[] = ['up', 'down', 'stall', 'stable', 'new']

function round(value: number) {
  return formatKg(Math.round(value * 10) / 10)
}

type Props = {
  log: TrainingLog
  today: string
  onOpenDate: (dateKey: string) => void
}

export function ProgressView({ log, today, onOpenDate }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [hoverWeek, setHoverWeek] = useState<number | null>(null)

  const sessions = Object.values(log.sessions).filter((session) =>
    Object.values(session.exercises).some((entry) => entry.sets.some((set) => set.done)),
  )
  const trends = exerciseTrends(log).sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.name.localeCompare(b.name, 'it'),
  )
  const weeks = weeklyVolume(log, fromDateKey(today), 8)
  const thisWeek = weeks.at(-1)!
  const lastWeek = weeks.at(-2)!
  const monthAgo = toDateKey(addDays(fromDateKey(today), -30))
  const last30 = sessions.filter((session) => session.date >= monthAgo && session.date <= today).length

  const counts = {
    up: trends.filter((trend) => trend.status === 'up').length,
    stable: trends.filter((trend) => trend.status === 'stable').length,
    stall: trends.filter((trend) => trend.status === 'stall').length,
    down: trends.filter((trend) => trend.status === 'down').length,
  }
  const rated = counts.up + counts.stable + counts.stall + counts.down
  const volumeDelta = lastWeek.volume > 0 ? ((thisWeek.volume - lastWeek.volume) / lastWeek.volume) * 100 : null

  const visible = trends.filter((trend) =>
    filter === 'all'
      ? true
      : filter === 'up'
        ? trend.status === 'up'
        : filter === 'stuck'
          ? trend.status === 'stall' || trend.status === 'stable'
          : trend.status === 'down',
  )

  if (sessions.length === 0) {
    return (
      <div className="empty-state progress-empty">
        <span className="empty-symbol"><Icon name="chart" size={21} /></span>
        <strong>Ancora nessun allenamento registrato</strong>
        <p>Completa qualche serie dalla sezione Allenamento: qui vedrai carichi, record e dove stai progredendo.</p>
      </div>
    )
  }

  const maxVolume = Math.max(1, ...weeks.map((week) => week.volume))

  return (
    <div className="progress-page">
      <section className="verdict-card">
        <span className="eyebrow">IN GENERALE</span>
        <h2>
          {rated === 0
            ? 'Continua a registrare: dalla seconda sessione per esercizio vedrai i confronti.'
            : counts.up >= rated / 2
              ? `Stai progredendo bene: ${counts.up} esercizi su ${rated} in crescita.`
              : `${counts.up} esercizi su ${rated} in crescita: ci sono margini da sbloccare.`}
        </h2>
        {rated > 0 && (
          <div className="verdict-bar" aria-hidden="true">
            {(['up', 'stable', 'stall', 'down'] as const).map((key) =>
              counts[key] > 0 ? (
                <span key={key} className={`verdict-seg seg-${key}`} style={{ flexGrow: counts[key] }} />
              ) : null,
            )}
          </div>
        )}
        {rated > 0 && (
          <ul className="verdict-legend">
            {(['up', 'stable', 'stall', 'down'] as const).map((key) => (
              <li key={key}>
                <span className={`status-badge status-${key}`}><Icon name={STATUS[key].icon} size={12} /> {STATUS[key].label}</span>
                <strong>{counts[key]}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stats-grid progress-stats" aria-label="Riepilogo allenamenti">
        <article className="stat-card">
          <span className="stat-icon icon-lime"><Icon name="calendar" size={17} /></span>
          <div><strong>{last30}</strong><span>allenamenti negli ultimi 30 giorni</span></div>
          <small>{sessions.length} IN TOTALE</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon icon-peach"><Icon name="check" size={17} /></span>
          <div><strong>{thisWeek.sets}</strong><span>serie questa settimana</span></div>
          <small>{lastWeek.sets} LA SCORSA</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon icon-blue"><Icon name="chart" size={17} /></span>
          <div>
            <strong>{Math.round(thisWeek.volume).toLocaleString('it-IT')} kg</strong>
            <span>volume questa settimana</span>
          </div>
          <small>
            {volumeDelta === null ? '—' : `${volumeDelta >= 0 ? '+' : ''}${Math.round(volumeDelta)}% VS SCORSA`}
          </small>
        </article>
      </section>

      <section className="chart-card">
        <div className="chart-head">
          <div>
            <span className="eyebrow">ULTIME 8 SETTIMANE</span>
            <h3>Volume settimanale (kg × rep)</h3>
          </div>
          <span className="chart-readout" aria-live="polite">
            {hoverWeek !== null
              ? `Sett. ${formatShortDate(weeks[hoverWeek].start)}: ${Math.round(weeks[hoverWeek].volume).toLocaleString('it-IT')} kg · ${weeks[hoverWeek].sessions} allenamenti`
              : `Questa settimana: ${Math.round(thisWeek.volume).toLocaleString('it-IT')} kg`}
          </span>
        </div>
        <div className="volume-chart" onMouseLeave={() => setHoverWeek(null)}>
          {weeks.map((week, index) => (
            <button
              key={week.start}
              className={`volume-col ${hoverWeek === index ? 'hover' : ''} ${index === weeks.length - 1 ? 'current' : ''}`}
              onMouseEnter={() => setHoverWeek(index)}
              onFocus={() => setHoverWeek(index)}
              onBlur={() => setHoverWeek(null)}
              aria-label={`Settimana del ${formatShortDate(week.start)}: ${Math.round(week.volume)} kg, ${week.sessions} allenamenti`}
            >
              <span className="volume-bar-wrap">
                <span className="volume-bar" style={{ height: `${Math.max(week.volume > 0 ? 3 : 0, (week.volume / maxVolume) * 100)}%` }} />
              </span>
              <span className="volume-label">{fromDateKey(week.start).getDate()}/{fromDateKey(week.start).getMonth() + 1}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ESERCIZIO PER ESERCIZIO</span>
            <h2>Dove progredisci e dove no</h2>
          </div>
        </div>
        <div className="filter-row" role="tablist">
          {([
            ['all', `Tutti (${trends.length})`],
            ['up', `In progresso (${counts.up})`],
            ['stuck', `Fermi o stabili (${counts.stall + counts.stable})`],
            ['down', `In calo (${counts.down})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              className={filter === key ? 'filter-chip active' : 'filter-chip'}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="trend-list">
          {visible.map((trend) => (
            <TrendCard
              key={trend.key}
              trend={trend}
              open={openKey === trend.key}
              onToggle={() => setOpenKey((current) => (current === trend.key ? null : trend.key))}
              onOpenDate={onOpenDate}
            />
          ))}
          {visible.length === 0 && <div className="empty-inline">Nessun esercizio in questa categoria.</div>}
        </div>
        <p className="panel-footnote progress-footnote">
          <span className="footnote-mark">i</span>
          <span>
            Per gli esercizi con carico il confronto usa il 1RM stimato (peso × (1 + rep/30)), così conta sia
            aumentare il peso sia fare più ripetizioni. “Fermo” significa nessun miglioramento da almeno 3 sessioni.
          </span>
        </p>
      </section>
    </div>
  )
}

function TrendCard({
  trend,
  open,
  onToggle,
  onOpenDate,
}: {
  trend: ExerciseTrend
  open: boolean
  onToggle: () => void
  onOpenDate: (dateKey: string) => void
}) {
  const last = trend.points.at(-1)!
  const status = STATUS[trend.status]

  return (
    <article className={`trend-card ${open ? 'open' : ''}`}>
      <button className="trend-main" onClick={onToggle} aria-expanded={open}>
        <div className="trend-name">
          <strong>{trend.name}</strong>
          <span className={`status-badge status-${trend.status}`}>
            <Icon name={status.icon} size={12} /> {status.label}
            {trend.status === 'stall' && ` da ${trend.sessionsSinceRecord} sessioni`}
          </span>
        </div>
        <Sparkline trend={trend} />
        <div className="trend-value">
          <strong>{round(last.value)} <small>{trend.unit}</small></strong>
          <span>{trend.metricLabel}</span>
          {trend.changePct !== null && (
            <em className={trend.changePct > 0.5 ? 'delta-up' : trend.changePct < -0.5 ? 'delta-down' : ''}>
              {trend.changePct >= 0 ? '+' : ''}{Math.round(trend.changePct)}% dall’inizio
            </em>
          )}
        </div>
      </button>
      {open && (
        <table className="trend-table">
          <thead>
            <tr><th>Data</th><th>Serie</th><th>{trend.metricLabel}</th></tr>
          </thead>
          <tbody>
            {[...trend.points].reverse().map((point) => (
              <tr key={point.date}>
                <td>
                  <button className="text-button" onClick={() => onOpenDate(point.date)}>
                    {formatShortDate(point.date)}
                  </button>
                </td>
                <td>{point.sets.filter((set) => set.done).map((set) => describeSet(set, trend.isTime)).join(' · ')}</td>
                <td>{round(point.value)} {trend.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  )
}

function Sparkline({ trend }: { trend: ExerciseTrend }) {
  const points = trend.points.slice(-10)
  const width = 132
  const height = 40
  const pad = 5
  if (points.length < 2) {
    return <span className="sparkline sparkline-empty">1 sessione</span>
  }
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const coords = points.map((point, index) => ({
    x: pad + (index / (points.length - 1)) * (width - pad * 2),
    y: height - pad - ((point.value - min) / range) * (height - pad * 2),
    point,
  }))
  const lastCoord = coords.at(-1)!

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img"
      aria-label={`${trend.metricLabel}: da ${round(values[0])} a ${round(values.at(-1)!)} ${trend.unit}`}>
      <polyline points={coords.map(({ x, y }) => `${x},${y}`).join(' ')} />
      {coords.map(({ x, y, point }) => (
        <circle key={point.date} className="spark-hit" cx={x} cy={y} r={7}>
          <title>{`${formatShortDate(point.date)}: ${round(point.value)} ${trend.unit}`}</title>
        </circle>
      ))}
      <circle className="spark-last" cx={lastCoord.x} cy={lastCoord.y} r={4} />
    </svg>
  )
}
