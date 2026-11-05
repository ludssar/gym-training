import type { Exercise, TrainingPlan, Workout } from './types'

// ---------- Tipi dello storico ----------

export type SetLog = {
  weightKg: number | null
  reps: number | null
  done: boolean
}

export type ExerciseLog = {
  exerciseId: string
  name: string
  historyKey: string
  target: string
  weighted: boolean
  sets: SetLog[]
}

export type SessionLog = {
  date: string
  workoutId: string
  workoutTitle: string
  exercises: Record<string, ExerciseLog>
  completedAt?: string
  updatedAt: string
}

export type TrainingLog = {
  sessions: Record<string, SessionLog>
}

export const emptyLog: TrainingLog = { sessions: {} }

// ---------- Salvataggio locale ----------

const LOG_KEY = 'gym-training.log.v1'

export function isTrainingLog(value: unknown): value is TrainingLog {
  if (!value || typeof value !== 'object') return false
  const sessions = (value as Partial<TrainingLog>).sessions
  if (!sessions || typeof sessions !== 'object') return false
  return Object.values(sessions).every((session) => {
    if (!session || typeof session !== 'object') return false
    const item = session as Partial<SessionLog>
    return (
      typeof item.date === 'string' &&
      typeof item.workoutId === 'string' &&
      typeof item.workoutTitle === 'string' &&
      !!item.exercises &&
      typeof item.exercises === 'object' &&
      Object.values(item.exercises).every((entry) => {
        const log = entry as Partial<ExerciseLog>
        return (
          typeof log.name === 'string' &&
          typeof log.historyKey === 'string' &&
          Array.isArray(log.sets)
        )
      })
    )
  })
}

export function readStoredLog(): { log: TrainingLog; canSave: boolean } {
  try {
    const saved = window.localStorage.getItem(LOG_KEY)
    if (!saved) return { log: emptyLog, canSave: true }
    const parsed: unknown = JSON.parse(saved)
    if (!isTrainingLog(parsed)) return { log: emptyLog, canSave: false }
    return { log: parsed, canSave: true }
  } catch {
    return { log: emptyLog, canSave: false }
  }
}

export function writeStoredLog(log: TrainingLog) {
  window.localStorage.setItem(LOG_KEY, JSON.stringify(log))
}

/** Unisce due storici tenendo, per ogni giorno, la versione modificata più di recente. */
export function mergeLogs(a: TrainingLog, b: TrainingLog): TrainingLog {
  const sessions = { ...a.sessions }
  for (const [date, session] of Object.entries(b.sessions)) {
    const current = sessions[date]
    if (!current || (session.updatedAt ?? '') > (current.updatedAt ?? '')) {
      sessions[date] = session
    }
  }
  return { sessions }
}

// ---------- Date ----------

export function toDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Lunedì della settimana che contiene la data. */
export function startOfWeek(date: Date) {
  const day = (date.getDay() + 6) % 7
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - day)
  return start
}

export function formatShortDate(key: string) {
  const text = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(fromDateKey(key))
  return text.replace('.', '')
}

export function formatLongDate(key: string) {
  const text = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(fromDateKey(key))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// ---------- Giorno → allenamento ----------

const WEEKDAYS = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato']

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('it-IT')
    .trim()
}

function workoutWeekday(workout: Workout) {
  return normalize(workout.day.split('·')[0])
}

export function workoutsForWeekday(plan: TrainingPlan, date: Date) {
  const weekday = WEEKDAYS[date.getDay()]
  return plan.workouts.filter((workout) => workoutWeekday(workout) === weekday)
}

function isoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Allenamento proposto per una data. Se il giorno ha più varianti (es. Lunedì A/B)
 * alterna rispetto all'ultima variante registrata; senza storico usa la settimana pari/dispari.
 */
export function proposedWorkout(plan: TrainingPlan, log: TrainingLog, dateKey: string): Workout | null {
  const logged = log.sessions[dateKey]
  if (logged) {
    const workout = plan.workouts.find((item) => item.id === logged.workoutId)
    if (workout) return workout
  }

  const date = fromDateKey(dateKey)
  const candidates = workoutsForWeekday(plan, date)
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  const ids = candidates.map((item) => item.id)
  const previous = Object.values(log.sessions)
    .filter((session) => session.date < dateKey && ids.includes(session.workoutId))
    .sort((a, b) => b.date.localeCompare(a.date))[0]

  if (previous) {
    const index = ids.indexOf(previous.workoutId)
    return candidates[(index + 1) % candidates.length]
  }

  return candidates[isoWeek(date) % candidates.length]
}

// ---------- Esercizi ----------

export type RepTarget = {
  min: number | null
  max: number | null
  isTime: boolean
  numeric: boolean
}

export function parseTarget(reps: string): RepTarget {
  const isTime = /sec|''|"/i.test(reps)
  const numbers = (reps.match(/\d+/g) ?? []).map(Number)
  if (numbers.length === 0) return { min: null, max: null, isTime, numeric: false }
  return {
    min: numbers[0],
    max: numbers.length > 1 ? numbers[1] : numbers[0],
    isTime,
    numeric: true,
  }
}

// Gruppi che si spuntano e basta: niente rep, suggerimenti o grafici.
const LIGHT_GROUPS = ['riscaldamento', 'rilassamento', 'attivazione', 'attivazione neurale']

/** True se per l'esercizio ha senso registrare carichi o ripetizioni. */
export function isLoggable(exercise: Exercise) {
  if (exercise.weightTracked !== false) return true
  if (LIGHT_GROUPS.includes(normalize(exercise.muscleGroup))) return false
  return parseTarget(exercise.reps).numeric
}

export function historyKey(exercise: Exercise) {
  const weighted = exercise.weightTracked !== false
  return `${normalize(exercise.name)}|${weighted ? 'w' : 'bw'}`
}

export function newExerciseLog(exercise: Exercise): ExerciseLog {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    historyKey: historyKey(exercise),
    target: exercise.reps,
    weighted: exercise.weightTracked !== false,
    sets: Array.from({ length: Math.max(1, exercise.sets) }, () => ({
      weightKg: null,
      reps: null,
      done: false,
    })),
  }
}

export function newSession(dateKey: string, workout: Workout): SessionLog {
  return {
    date: dateKey,
    workoutId: workout.id,
    workoutTitle: workout.title,
    exercises: {},
    updatedAt: new Date().toISOString(),
  }
}

/** Numero di serie previste o registrate (se ne hai aggiunte). */
export function setCount(exercise: Exercise, entry?: ExerciseLog) {
  return Math.max(Math.max(1, exercise.sets), entry?.sets.length ?? 0)
}

export function sessionProgress(workout: Workout, session?: SessionLog) {
  let total = 0
  let done = 0
  for (const exercise of workout.exercises) {
    const entry = session?.exercises[exercise.id]
    total += setCount(exercise, entry)
    done += entry?.sets.filter((set) => set.done).length ?? 0
  }
  return { total, done, ratio: total === 0 ? 0 : done / total }
}

// ---------- Sessione precedente e suggerimenti ----------

export type PreviousPerformance = {
  date: string
  entry: ExerciseLog
}

function hasData(entry: ExerciseLog) {
  return entry.sets.some((set) => set.done)
}

export function previousPerformance(
  log: TrainingLog,
  key: string,
  beforeDate: string,
): PreviousPerformance | null {
  const sessions = Object.values(log.sessions)
    .filter((session) => session.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date))
  for (const session of sessions) {
    const entry = Object.values(session.exercises).find(
      (item) => item.historyKey === key && hasData(item),
    )
    if (entry) return { date: session.date, entry }
  }
  return null
}

export type Suggestion = {
  kind: 'increase' | 'repeat' | 'recover' | 'more-reps'
  message: string
  weightKg?: number
}

function roundToPlate(value: number) {
  return Math.round(value * 2) / 2
}

export function weightStep(exercise: Exercise, weight: number) {
  const name = normalize(exercise.name)
  if (name.includes('manubri') || name.includes('kettlebell')) return 2
  if (weight < 20) return 1
  return 2.5
}

export function formatKg(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',')
}

export function suggestionFor(exercise: Exercise, previous: PreviousPerformance | null): Suggestion | null {
  if (!previous || !isLoggable(exercise)) return null
  const target = parseTarget(exercise.reps)
  const doneSets = previous.entry.sets.filter((set) => set.done)
  if (doneSets.length === 0) return null

  const plannedSets = Math.max(1, exercise.sets)
  const allSetsDone = doneSets.length >= plannedSets
  const top = target.max ?? null
  const unit = target.isTime ? 'sec' : 'rep'
  const repsHit = top === null || doneSets.every((set) => (set.reps ?? 0) >= top)
  const weights = doneSets.map((set) => set.weightKg ?? 0)
  const maxWeight = Math.max(...weights)
  const sameWeight = weights.every((weight) => weight === maxWeight)
  const weighted = exercise.weightTracked !== false && maxWeight > 0

  if (!weighted) {
    if (!target.numeric) return null
    if (allSetsDone && repsHit) {
      return {
        kind: 'more-reps',
        message: target.isTime
          ? 'Hai chiuso tutto: prova ad aggiungere 5–10 sec a serie.'
          : exercise.weightTracked !== false
            ? 'Hai chiuso tutto: aggiungi 1–2 rep o un po’ di zavorra.'
            : 'Hai chiuso tutto: aumenta l’intensità o 1 rep a serie.',
      }
    }
    return { kind: 'repeat', message: `Punta a chiudere tutte le serie a ${top} ${unit}.` }
  }

  if (allSetsDone && repsHit && sameWeight) {
    const next = roundToPlate(maxWeight + weightStep(exercise, maxWeight))
    return {
      kind: 'increase',
      message: `Hai chiuso tutte le serie a ${formatKg(maxWeight)} kg: prova ${formatKg(next)} kg.`,
      weightKg: next,
    }
  }

  if (!sameWeight) {
    return {
      kind: 'recover',
      message: `L’ultima volta hai dovuto scalare il carico: riparti da ${formatKg(maxWeight)} kg e prova a tenerlo su tutte le serie.`,
      weightKg: maxWeight,
    }
  }

  return {
    kind: 'repeat',
    message: `Resta a ${formatKg(maxWeight)} kg e punta a chiudere ${top ?? ''} ${unit} su tutte le serie.`,
    weightKg: maxWeight,
  }
}

export function describeSet(set: SetLog, isTime: boolean) {
  const reps = set.reps ?? '–'
  const unit = isTime ? '″' : ''
  if (set.weightKg && set.weightKg > 0) return `${formatKg(set.weightKg)}×${reps}${unit}`
  return `${reps}${isTime ? '″' : ' rep'}`
}

// ---------- Analisi dei progressi ----------

export type TrendStatus = 'up' | 'stable' | 'stall' | 'down' | 'new'

export type ExercisePoint = {
  date: string
  value: number
  topWeight: number
  bestReps: number
  sets: SetLog[]
}

export type ExerciseTrend = {
  key: string
  name: string
  metricLabel: string
  unit: string
  isTime: boolean
  points: ExercisePoint[]
  status: TrendStatus
  changePct: number | null
  sessionsSinceRecord: number
}

/** 1RM stimato con la formula delle note: peso × (1 + rep/30). */
export function estimatedOneRepMax(weight: number, reps: number) {
  return weight * (1 + reps / 30)
}

function pointFor(entry: ExerciseLog, date: string): ExercisePoint | null {
  const done = entry.sets.filter((set) => set.done)
  if (done.length === 0) return null
  const target = parseTarget(entry.target)
  const topWeight = Math.max(0, ...done.map((set) => set.weightKg ?? 0))
  const bestReps = Math.max(0, ...done.map((set) => set.reps ?? 0))
  let value: number
  if (topWeight > 0 && !target.isTime) {
    value = Math.max(...done.map((set) => estimatedOneRepMax(set.weightKg ?? 0, set.reps ?? 0)))
  } else if (topWeight > 0) {
    value = topWeight
  } else {
    value = bestReps
  }
  return { date, value, topWeight, bestReps, sets: entry.sets }
}

export function exerciseTrends(log: TrainingLog): ExerciseTrend[] {
  const byKey = new Map<string, { name: string; target: string; points: ExercisePoint[] }>()
  const sessions = Object.values(log.sessions).sort((a, b) => a.date.localeCompare(b.date))

  for (const session of sessions) {
    for (const entry of Object.values(session.exercises)) {
      const point = pointFor(entry, session.date)
      if (!point || (point.topWeight === 0 && point.bestReps === 0)) continue
      const bucket = byKey.get(entry.historyKey) ?? { name: entry.name, target: entry.target, points: [] }
      bucket.name = entry.name
      bucket.target = entry.target
      bucket.points.push(point)
      byKey.set(entry.historyKey, bucket)
    }
  }

  return [...byKey.entries()].map(([key, bucket]) => {
    const target = parseTarget(bucket.target)
    const last = bucket.points.at(-1)!
    const usesWeight = last.topWeight > 0
    const metricLabel = usesWeight ? (target.isTime ? 'Carico massimo' : '1RM stimato') : target.isTime ? 'Tenuta migliore' : 'Rep migliori'
    const unit = usesWeight ? 'kg' : target.isTime ? 'sec' : 'rep'

    let status: TrendStatus = 'new'
    let changePct: number | null = null
    let sessionsSinceRecord = 0

    if (bucket.points.length >= 2) {
      const values = bucket.points.map((point) => point.value)
      const previous = values.at(-2)!
      const bestBefore = Math.max(...values.slice(0, -1))
      const first = values[0]
      changePct = first > 0 ? ((last.value - first) / first) * 100 : null

      let best = values[0]
      sessionsSinceRecord = 0
      for (let i = 1; i < values.length; i += 1) {
        if (values[i] > best * 1.005) {
          best = values[i]
          sessionsSinceRecord = 0
        } else {
          sessionsSinceRecord += 1
        }
      }

      if (last.value > bestBefore * 1.005) status = 'up'
      else if (last.value < previous * 0.97) status = 'down'
      else if (sessionsSinceRecord >= 3) status = 'stall'
      else status = 'stable'
    }

    return {
      key,
      name: bucket.name,
      metricLabel,
      unit,
      isTime: target.isTime,
      points: bucket.points,
      status,
      changePct,
      sessionsSinceRecord,
    }
  })
}

export type WeekVolume = {
  start: string
  volume: number
  sessions: number
  sets: number
}

/** Volume (kg × rep) e serie completate per settimana, ultime `weeks` settimane. */
export function weeklyVolume(log: TrainingLog, today: Date, weeks = 8): WeekVolume[] {
  const firstWeek = addDays(startOfWeek(today), -7 * (weeks - 1))
  const result: WeekVolume[] = Array.from({ length: weeks }, (_, index) => ({
    start: toDateKey(addDays(firstWeek, index * 7)),
    volume: 0,
    sessions: 0,
    sets: 0,
  }))

  for (const session of Object.values(log.sessions)) {
    const date = fromDateKey(session.date)
    const index = Math.floor((startOfWeek(date).getTime() - firstWeek.getTime()) / (7 * 86400000) + 0.01)
    if (index < 0 || index >= weeks) continue
    let counted = false
    for (const entry of Object.values(session.exercises)) {
      const isTime = parseTarget(entry.target).isTime
      for (const set of entry.sets) {
        if (!set.done) continue
        counted = true
        result[index].sets += 1
        if (!isTime) result[index].volume += (set.weightKg ?? 0) * (set.reps ?? 0)
      }
    }
    if (counted) result[index].sessions += 1
  }

  return result
}
