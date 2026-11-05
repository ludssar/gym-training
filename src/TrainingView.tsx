import { useEffect, useState } from 'react'
import { Calendar } from './Calendar'
import { Icon } from './Icon'
import { videoSearchUrl } from './data'
import {
  describeSet,
  exerciseTrends,
  formatKg,
  formatLongDate,
  formatShortDate,
  fromDateKey,
  historyKey,
  isLoggable,
  newExerciseLog,
  newSession,
  parseTarget,
  previousPerformance,
  proposedWorkout,
  sessionProgress,
  setCount,
  suggestionFor,
  type ExerciseLog,
  type PreviousPerformance,
  type SessionLog,
  type SetLog,
  type Suggestion,
  type TrainingLog,
} from './log'
import type { Exercise, TrainingPlan, Workout, WorkoutSection } from './types'

type Props = {
  plan: TrainingPlan
  log: TrainingLog
  selectedDate: string
  today: string
  sections: (workout: Workout) => WorkoutSection[]
  onSelectDate: (dateKey: string) => void
  onSaveSession: (session: SessionLog) => void
  onDeleteSession: (dateKey: string) => void
  onFinishSession: (dateKey: string) => void
}

export function TrainingView({
  plan,
  log,
  selectedDate,
  today,
  sections,
  onSelectDate,
  onSaveSession,
  onDeleteSession,
  onFinishSession,
}: Props) {
  const [manualChoice, setManualChoice] = useState<Record<string, string>>({})
  const session = log.sessions[selectedDate]
  const proposed = proposedWorkout(plan, log, selectedDate)
  const chosenId = session?.workoutId ?? manualChoice[selectedDate] ?? proposed?.id
  const workout = plan.workouts.find((item) => item.id === chosenId) ?? null
  const isFuture = selectedDate > today

  const chooseWorkout = (workoutId: string) => {
    if (workoutId === chosenId) return
    if (session) {
      const progress = workout ? sessionProgress(workout, session) : null
      if (progress && progress.done > 0 && !window.confirm('Cambiare allenamento? Le serie già registrate per questo giorno verranno cancellate.')) {
        return
      }
      onDeleteSession(selectedDate)
    }
    setManualChoice((current) => ({ ...current, [selectedDate]: workoutId }))
  }

  const saveEntry = (exercise: Exercise, entry: ExerciseLog) => {
    if (!workout) return
    const base = session ?? newSession(selectedDate, workout)
    onSaveSession({
      ...base,
      workoutTitle: workout.title,
      exercises: { ...base.exercises, [exercise.id]: entry },
      updatedAt: new Date().toISOString(),
    })
  }

  const progress = workout ? sessionProgress(workout, session) : { total: 0, done: 0, ratio: 0 }
  const percent = Math.round(progress.ratio * 100)
  const finished = Boolean(session?.completedAt)
  const training = selectedDate === today && Boolean(session) && !finished

  useKeepScreenOn(training)

  return (
    <div className="training-layout">
      <div className="training-side">
        <Calendar
          plan={plan}
          log={log}
          selected={selectedDate}
          today={today}
          onSelect={onSelectDate}
        />
      </div>

      <div className="training-main">
        <section className="day-card">
          <span className="day-label">
            {selectedDate === today ? 'Oggi · ' : ''}{formatLongDate(selectedDate)}
          </span>
          <h2>{workout ? workout.title : 'Giorno di riposo'}</h2>
          <p>
            {workout
              ? workout.focus
              : proposed === null && fromDateKey(selectedDate).getDay() === 6
                ? 'Sabato è giorno di gara: nessun allenamento in programma.'
                : 'Nessun allenamento in programma. Se vuoi, scegline uno qui sotto.'}
          </p>
          <div className="workout-chips" role="radiogroup" aria-label="Scegli l’allenamento">
            {plan.workouts.map((item) => (
              <button
                key={item.id}
                role="radio"
                aria-checked={item.id === chosenId}
                className={item.id === chosenId ? 'workout-chip active' : 'workout-chip'}
                onClick={() => chooseWorkout(item.id)}
              >
                {item.day}
                {item.id === proposed?.id && item.id !== chosenId && <small> · proposto</small>}
              </button>
            ))}
          </div>
        </section>

        {workout && (
          <>
            <div className={`progress-sticky ${percent === 100 ? 'complete' : ''}`}>
              <div className="progress-copy">
                <strong>{percent}%</strong>
                <span>{progress.done} di {progress.total} serie completate</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Avanzamento allenamento"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.done}
              >
                <span style={{ width: `${percent}%` }} />
              </div>
            </div>

            {isFuture && !session && (
              <div className="notice notice-info">
                Questo allenamento è nel futuro: puoi vedere cosa ti aspetta e da quali carichi ripartire.
              </div>
            )}

            {finished && (
              <SessionSummary log={log} session={session!} workout={workout} />
            )}

            <div className="session-sections">
              {sections(workout).map((section) => {
                const exercises = section.exerciseIds
                  .map((id) => workout.exercises.find((item) => item.id === id))
                  .filter((item): item is Exercise => item !== undefined)
                if (exercises.length === 0) return null
                const sectionTotal = exercises.reduce(
                  (sum, item) => sum + setCount(item, session?.exercises[item.id]),
                  0,
                )
                const sectionDone = exercises.reduce(
                  (sum, item) => sum + (session?.exercises[item.id]?.sets.filter((set) => set.done).length ?? 0),
                  0,
                )

                return (
                  <section className="session-section" key={section.id}>
                    <div className="session-section-head">
                      <div>
                        <h3>{section.title}</h3>
                        {section.description && <p>{section.description}</p>}
                      </div>
                      <span className={sectionDone === sectionTotal ? 'section-count done' : 'section-count'}>
                        {sectionDone === sectionTotal && <Icon name="check" size={13} />}
                        {sectionDone}/{sectionTotal}
                      </span>
                    </div>
                    {exercises.map((exercise) => {
                      const previous = previousPerformance(log, historyKey(exercise), selectedDate)
                      return (
                        <ExerciseLogger
                          key={exercise.id}
                          exercise={exercise}
                          entry={session?.exercises[exercise.id]}
                          previous={previous}
                          suggestion={suggestionFor(exercise, previous)}
                          onChange={(entry) => saveEntry(exercise, entry)}
                        />
                      )
                    })}
                  </section>
                )
              })}
            </div>

            <div className="session-footer">
              {session && !finished && (
                <button
                  className="button button-outline"
                  onClick={() => {
                    if (window.confirm('Cancellare tutte le serie registrate per questo giorno?')) {
                      onDeleteSession(selectedDate)
                    }
                  }}
                >
                  <Icon name="trash" size={16} /> Azzera giorno
                </button>
              )}
              {!finished ? (
                <button
                  className="button button-dark"
                  disabled={progress.done === 0}
                  onClick={() => onFinishSession(selectedDate)}
                >
                  <Icon name="flag" size={16} /> Termina allenamento
                </button>
              ) : (
                <span className="finished-label"><Icon name="check" size={16} /> Allenamento salvato</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------- Schermo acceso durante l'allenamento ----------

type WakeLockHandle = { release: () => Promise<void> }
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockHandle> }
}

/** Tiene lo schermo del telefono acceso mentre registri le serie (dove il browser lo permette). */
function useKeepScreenOn(active: boolean) {
  useEffect(() => {
    const wakeLock = (navigator as WakeLockNavigator).wakeLock
    if (!active || !wakeLock) return
    let handle: WakeLockHandle | null = null
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const next = await wakeLock.request('screen')
        if (cancelled) void next.release()
        else handle = next
      } catch {
        // Non supportato o negato: lo schermo si spegnerà come al solito.
      }
    }
    const onVisible = () => void acquire()

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void handle?.release()
    }
  }, [active])
}

// ---------- Un esercizio con le sue serie ----------

type LoggerProps = {
  exercise: Exercise
  entry?: ExerciseLog
  previous: PreviousPerformance | null
  suggestion: Suggestion | null
  onChange: (entry: ExerciseLog) => void
}

function ExerciseLogger({ exercise, entry, previous, suggestion, onChange }: LoggerProps) {
  const target = parseTarget(exercise.reps)
  const tracksWeight = exercise.weightTracked !== false
  const current = entry ?? newExerciseLog(exercise)
  const sets: SetLog[] = Array.from(
    { length: setCount(exercise, entry) },
    (_, index) => current.sets[index] ?? { weightKg: null, reps: null, done: false },
  )
  const doneCount = sets.filter((set) => set.done).length
  const allDone = doneCount === sets.length
  const checkOnly = !isLoggable(exercise)
  const repUnit = target.isTime ? 'sec' : 'rep'
  const maxDoneWeight = Math.max(0, ...sets.filter((set) => set.done).map((set) => set.weightKg ?? 0))

  const save = (nextSets: SetLog[]) =>
    onChange({
      ...current,
      name: exercise.name,
      target: exercise.reps,
      weighted: tracksWeight,
      historyKey: historyKey(exercise),
      sets: nextSets,
    })

  /** Valori "fantasma": quello che verrebbe registrato premendo ✓ senza scrivere nulla. */
  const ghostWeight = (index: number) => {
    for (let i = index - 1; i >= 0; i -= 1) {
      if (sets[i].weightKg !== null) return sets[i].weightKg
    }
    const previousSet = previous?.entry.sets[index] ?? previous?.entry.sets.at(-1)
    if (previousSet?.weightKg != null) return previousSet.weightKg
    return exercise.weightKg > 0 ? exercise.weightKg : null
  }

  const ghostReps = (index: number) => {
    const previousSet = previous?.entry.sets[index]
    if (previousSet?.done && previousSet.reps != null) return previousSet.reps
    return target.max
  }

  const updateSet = (index: number, updates: Partial<SetLog>) =>
    save(sets.map((set, i) => (i === index ? { ...set, ...updates } : set)))

  const toggleDone = (index: number) => {
    const set = sets[index]
    if (set.done) {
      updateSet(index, { done: false })
      return
    }
    updateSet(index, {
      done: true,
      weightKg: tracksWeight ? set.weightKg ?? ghostWeight(index) : null,
      reps: target.numeric && !checkOnly ? set.reps ?? ghostReps(index) : null,
    })
  }

  const applySuggestion = () => {
    if (suggestion?.weightKg == null) return
    save(sets.map((set) => (set.done ? set : { ...set, weightKg: suggestion.weightKg! })))
  }

  const parseNumber = (value: string) => {
    if (value.trim() === '') return null
    const number = Number(value.replace(',', '.'))
    return Number.isFinite(number) && number >= 0 ? number : null
  }

  return (
    <article className={`logger ${allDone ? 'logger-done' : ''}`}>
      <header className="logger-head">
        <div className="logger-title">
          <strong>{exercise.name}</strong>
          <span>
            {exercise.sets} × {exercise.reps}
            {exercise.restSeconds > 0 && ` · rec. ${exercise.restSeconds}s`}
            {exercise.muscleGroup && ` · ${exercise.muscleGroup}`}
          </span>
        </div>
        <span className="logger-count">{doneCount}/{sets.length}</span>
      </header>

      {previous && !checkOnly && (
        <p className="logger-previous">
          <span>Scorsa volta · {formatShortDate(previous.date)}</span>
          {previous.entry.sets.filter((set) => set.done).map((set) => describeSet(set, target.isTime)).join(' · ')}
        </p>
      )}

      {suggestion && (
        <div className={`suggestion suggestion-${suggestion.kind}`}>
          <Icon name={suggestion.kind === 'increase' ? 'trend-up' : suggestion.kind === 'recover' ? 'trend-flat' : 'flag'} size={15} />
          <span>{suggestion.message}</span>
          {suggestion.weightKg != null && suggestion.kind === 'increase' && !allDone && (
            <button className="suggestion-apply" onClick={applySuggestion}>Usa {formatKg(suggestion.weightKg)} kg</button>
          )}
        </div>
      )}

      <div className="set-list">
        {sets.map((set, index) => {
          const previousSet = previous?.entry.sets[index]
          const reduced = set.done && tracksWeight && (set.weightKg ?? 0) < maxDoneWeight
          const missedReps = set.done && target.min !== null && set.reps !== null && set.reps < target.min
          const ghostW = ghostWeight(index)
          const ghostR = ghostReps(index)

          return (
            <div className={`set-row ${set.done ? 'set-done' : ''} ${checkOnly ? 'set-check-only' : ''}`} key={index}>
              <span className="set-index">{index + 1}</span>

              {checkOnly ? (
                <span className="set-check-label">{exercise.reps}</span>
              ) : (
                <div className="set-inputs">
                  {tracksWeight && (
                    <label className={`set-field ${reduced ? 'reduced' : ''}`}>
                      <input
                        inputMode="decimal"
                        aria-label={`Serie ${index + 1}: carico in kg`}
                        placeholder={ghostW != null ? formatKg(ghostW) : '–'}
                        value={set.weightKg ?? ''}
                        onChange={(event) => updateSet(index, { weightKg: parseNumber(event.target.value) })}
                      />
                      <small>kg</small>
                    </label>
                  )}
                  {target.numeric && (
                    <label className={`set-field ${missedReps ? 'reduced' : ''}`}>
                      <input
                        inputMode="numeric"
                        aria-label={`Serie ${index + 1}: ${repUnit === 'sec' ? 'secondi' : 'ripetizioni'}`}
                        placeholder={ghostR != null ? String(ghostR) : '–'}
                        value={set.reps ?? ''}
                        onChange={(event) => updateSet(index, { reps: parseNumber(event.target.value) })}
                      />
                      <small>{repUnit}</small>
                    </label>
                  )}
                </div>
              )}

              <span className="set-ghost" title="Scorsa sessione">
                {previousSet?.done && !checkOnly ? describeSet(previousSet, target.isTime) : ''}
                {reduced && <em>carico ridotto</em>}
              </span>

              <button
                className="set-check"
                onClick={() => toggleDone(index)}
                aria-pressed={set.done}
                aria-label={set.done ? `Serie ${index + 1} completata: annulla` : `Completa serie ${index + 1}`}
              >
                <Icon name="check" size={18} />
              </button>
            </div>
          )
        })}
      </div>

      <footer className="logger-foot">
        <button
          className="mini-button"
          onClick={() => save([...sets, { weightKg: null, reps: null, done: false }])}
        >
          <Icon name="plus" size={13} /> Serie
        </button>
        {sets.length > Math.max(1, exercise.sets) && (
          <button className="mini-button" onClick={() => save(sets.slice(0, -1))}>
            <Icon name="minus" size={13} /> Serie
          </button>
        )}
        <details className="logger-howto">
          <summary>Come si esegue</summary>
          <p>{exercise.instructions || 'Nessuna indicazione salvata.'}</p>
        </details>
        <a
          className="mini-button"
          href={exercise.videoUrl || videoSearchUrl(exercise.name)}
          target="_blank"
          rel="noreferrer"
        >
          Video <Icon name="external" size={12} />
        </a>
      </footer>
    </article>
  )
}

// ---------- Riepilogo a fine allenamento ----------

function SessionSummary({ log, session, workout }: { log: TrainingLog; session: SessionLog; workout: Workout }) {
  const progress = sessionProgress(workout, session)
  let volume = 0
  for (const entry of Object.values(session.exercises)) {
    if (parseTarget(entry.target).isTime) continue
    for (const set of entry.sets) {
      if (set.done) volume += (set.weightKg ?? 0) * (set.reps ?? 0)
    }
  }

  const records = exerciseTrends(log).flatMap((trend) => {
    const index = trend.points.findIndex((point) => point.date === session.date)
    if (index < 1) return []
    const bestBefore = Math.max(...trend.points.slice(0, index).map((point) => point.value))
    const value = trend.points[index].value
    return value > bestBefore * 1.005 ? [{ name: trend.name, value, unit: trend.unit, label: trend.metricLabel }] : []
  })

  return (
    <section className="session-summary">
      <div className="summary-head">
        <span className="summary-icon"><Icon name="trophy" size={20} /></span>
        <div>
          <strong>Allenamento completato</strong>
          <span>{progress.done} serie · {Math.round(volume).toLocaleString('it-IT')} kg di volume</span>
        </div>
      </div>
      {records.length > 0 ? (
        <ul className="summary-records">
          {records.map((record) => (
            <li key={record.name}>
              <Icon name="trend-up" size={14} />
              <span><strong>{record.name}</strong> · nuovo record ({record.label.toLowerCase()} {formatKg(Math.round(record.value * 10) / 10)} {record.unit})</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nessun nuovo record oggi: conta anche consolidare i carichi.</p>
      )}
    </section>
  )
}
