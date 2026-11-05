import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { createId, initialPlan, isTrainingPlan, videoSearchUrl } from './data'
import { isCloudConfigured, supabase } from './cloud'
import { clearStoredPlan, readStoredPlan, writeStoredPlan } from './storage'
import type { Exercise, TrainingPlan, Workout, WorkoutSection } from './types'
import { Icon } from './Icon'
import { TrainingView } from './TrainingView'
import { ProgressView } from './ProgressView'
import { InstallHint } from './InstallHint'
import {
  emptyLog,
  isTrainingLog,
  mergeLogs,
  readStoredLog,
  toDateKey,
  writeStoredLog,
  type SessionLog,
  type TrainingLog,
} from './log'
import './App.css'
import './Training.css'

type View = 'today' | 'plan' | 'progress' | 'library'

const HEADINGS: Record<View, { eyebrow: string; title: string; text: string }> = {
  today: {
    eyebrow: 'DIARIO DI ALLENAMENTO',
    title: 'Allenamento',
    text: 'Scegli il giorno, segna le serie e guarda da dove ripartire.',
  },
  progress: {
    eyebrow: 'IL TUO RESOCONTO',
    title: 'Progressi',
    text: 'Carichi, record e dove stai migliorando, esercizio per esercizio.',
  },
  plan: {
    eyebrow: 'HOCKEY PERFORMANCE',
    title: '',
    text: 'Forza, potenza e mobilità per la tua settimana sul ghiaccio.',
  },
  library: {
    eyebrow: 'IL TUO ARCHIVIO',
    title: 'Libreria esercizi',
    text: 'Ritrova gli esercizi e le indicazioni salvate nelle tue schede.',
  },
}

const NAV_ITEMS = [
  { view: 'today', label: 'Allenamento', short: 'Oggi', icon: 'calendar' },
  { view: 'progress', label: 'Progressi', short: 'Progressi', icon: 'chart' },
  { view: 'plan', label: 'La mia scheda', short: 'Scheda', icon: 'plan' },
  { view: 'library', label: 'Esercizi', short: 'Esercizi', icon: 'library' },
] as const
type CloudStatus = 'local' | 'loading' | 'synced' | 'saving' | 'error'

function formatToday() {
  const date = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return date.charAt(0).toUpperCase() + date.slice(1)
}

function newExercise(): Exercise {
  return {
    id: createId(),
    name: '',
    muscleGroup: '',
    sets: 3,
    reps: '8–12',
    weightKg: 0,
    restSeconds: 90,
    instructions: '',
    videoUrl: '',
  }
}

function getWorkoutSections(workout: Workout): WorkoutSection[] {
  const sections = workout.sections
    ? workout.sections
    : [{
        id: `${workout.id}-exercises`,
        title: 'Allenamento',
        description: '',
        durationMinutes: workout.durationMinutes,
        exerciseIds: workout.exercises.map((exercise) => exercise.id),
      }]
  const exerciseIds = new Set(workout.exercises.map((exercise) => exercise.id))
  const mappedSections = sections.map((section) => ({
    ...section,
    exerciseIds: section.exerciseIds.filter((id) => exerciseIds.has(id)),
  }))
  const assignedIds = new Set(mappedSections.flatMap((section) => section.exerciseIds))
  const unassignedIds = workout.exercises
    .map((exercise) => exercise.id)
    .filter((id) => !assignedIds.has(id))

  if (unassignedIds.length > 0) {
    mappedSections.push({
      id: `${workout.id}-other-exercises`,
      title: 'Altri esercizi',
      description: '',
      durationMinutes: 0,
      exerciseIds: unassignedIds,
    })
  }

  return mappedSections
}

function withWorkoutExercise(workout: Workout, exercise: Exercise): Workout {
  const existingIndex = workout.exercises.findIndex((item) => item.id === exercise.id)
  if (existingIndex >= 0) {
    return {
      ...workout,
      exercises: workout.exercises.map((item) =>
        item.id === exercise.id ? exercise : item,
      ),
    }
  }

  const sections = getWorkoutSections(workout)
  const lastSection = sections.at(-1)
  return {
    ...workout,
    exercises: [...workout.exercises, exercise],
    sections: lastSection?.title === 'Altri esercizi'
      ? sections.map((section) =>
          section.id === lastSection.id
            ? { ...section, exerciseIds: [...section.exerciseIds, exercise.id] }
            : section,
        )
      : [
          ...sections,
          {
            id: createId(),
            title: 'Altri esercizi',
            description: 'Esercizi aggiunti alla scheda.',
            durationMinutes: 0,
            exerciseIds: [exercise.id],
          },
        ],
  }
}

function App() {
  const [stored] = useState(readStoredPlan)
  const [plan, setPlan] = useState<TrainingPlan>(stored.plan)
  const [canSave, setCanSave] = useState(stored.canSave)
  const [storageMessage, setStorageMessage] = useState(stored.warning)
  const [view, setView] = useState<View>('today')
  const [storedLog] = useState(readStoredLog)
  const [log, setLog] = useState<TrainingLog>(storedLog.log)
  const [canSaveLog, setCanSaveLog] = useState(storedLog.canSave)
  const today = toDateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(
    stored.plan.workouts[0]?.id ?? '',
  )
  const [editing, setEditing] = useState(false)
  const [editorWorkoutId, setEditorWorkoutId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Exercise | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [cloudReady, setCloudReady] = useState(false)
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('local')
  const [cloudMessage, setCloudMessage] = useState<string | null>(null)
  const [logCloudReady, setLogCloudReady] = useState(false)
  const planRef = useRef(plan)
  const logRef = useRef(log)
  const lastLoadedUser = useRef<string | null>(null)

  useEffect(() => {
    planRef.current = plan
  }, [plan])

  useEffect(() => {
    logRef.current = log
  }, [log])

  useEffect(() => {
    if (!storedLog.canSave) {
      setStorageMessage('Lo storico allenamenti salvato non è leggibile: le nuove serie non verranno salvate finché non lo azzeri.')
    }
  }, [storedLog.canSave])

  useEffect(() => {
    if (!canSaveLog) return
    try {
      writeStoredLog(log)
    } catch {
      setStorageMessage('Non riesco a salvare lo storico sul dispositivo. Controlla lo spazio disponibile nel browser.')
    }
  }, [canSaveLog, log])

  useEffect(() => {
    if (!canSave) return
    try {
      writeStoredPlan(plan)
      setStorageMessage(null)
    } catch {
      setStorageMessage('Non riesco a salvare sul dispositivo. Controlla lo spazio disponibile nel browser.')
    }
  }, [canSave, plan])

  useEffect(() => {
    if (!supabase) return
    let active = true

    const loadCloudLog = async (userId: string) => {
      const { data, error } = await supabase
        .from('user_logs')
        .select('log')
        .eq('user_id', userId)
        .maybeSingle()
      if (!active) return
      if (error) {
        setLogCloudReady(false)
        setCloudMessage('Il piano è sincronizzato, ma lo storico allenamenti resta su questo dispositivo: esegui di nuovo supabase/schema.sql nel pannello Supabase.')
        return
      }
      if (data && isTrainingLog(data.log)) {
        setLog((current) => mergeLogs(current, data.log as TrainingLog))
      }
      setLogCloudReady(true)
    }

    const loadCloudPlan = async (userId: string) => {
      if (lastLoadedUser.current === userId) return
      lastLoadedUser.current = userId
      setCloudReady(false)
      setCloudStatus('loading')
      setCloudMessage(null)

      const { data, error } = await supabase
        .from('user_plans')
        .select('plan')
        .eq('user_id', userId)
        .maybeSingle()

      if (!active) return
      if (error) {
        lastLoadedUser.current = null
        setCloudStatus('error')
        setCloudMessage(`Non riesco a leggere il piano dal cloud: ${error.message}`)
        return
      }

      if (data) {
        if (!isTrainingPlan(data.plan)) {
          lastLoadedUser.current = null
          setCloudStatus('error')
          setCloudMessage('Il piano salvato nel cloud non è valido; i dati locali non sono stati sostituiti.')
          return
        }
        setPlan(data.plan)
        setCanSave(true)
        setCloudStatus('synced')
        setCloudReady(true)
        void loadCloudLog(userId)
        return
      }

      const { error: saveError } = await supabase.from('user_plans').upsert({
        user_id: userId,
        plan: planRef.current,
      })

      if (!active) return
      if (saveError) {
        lastLoadedUser.current = null
        setCloudStatus('error')
        setCloudMessage(`Non riesco a creare il piano cloud: ${saveError.message}`)
        return
      }
      setCloudStatus('synced')
      setCloudReady(true)
      void loadCloudLog(userId)
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        lastLoadedUser.current = null
        setUser(null)
        setCloudReady(false)
        setLogCloudReady(false)
        setCloudStatus('local')
        return
      }
      setUser(session.user)
      window.setTimeout(() => {
        if (active) void loadCloudPlan(session.user.id)
      }, 0)
    })

    void supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active) return
      if (error) {
        setCloudStatus('error')
        setCloudMessage(`Errore di accesso al cloud: ${error.message}`)
        return
      }
      if (sessionData.session) {
        setUser(sessionData.session.user)
        void loadCloudPlan(sessionData.session.user.id)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user || !cloudReady || !supabase || !canSave) return
    setCloudStatus('saving')
    const timeout = window.setTimeout(() => {
      void supabase
        .from('user_plans')
        .upsert({ user_id: user.id, plan })
        .then(({ error }) => {
          if (error) {
            setCloudStatus('error')
            setCloudMessage(`Modifiche salvate sul dispositivo, ma non nel cloud: ${error.message}`)
            return
          }
          setCloudStatus('synced')
          setCloudMessage(null)
        })
    }, 650)

    return () => window.clearTimeout(timeout)
  }, [canSave, cloudReady, plan, user])

  useEffect(() => {
    if (!user || !logCloudReady || !supabase || !canSaveLog) return
    const timeout = window.setTimeout(() => {
      void supabase
        .from('user_logs')
        .upsert({ user_id: user.id, log: logRef.current })
        .then(({ error }) => {
          if (error) {
            setCloudMessage(`Serie salvate sul dispositivo, ma non nel cloud: ${error.message}`)
          }
        })
    }, 800)
    return () => window.clearTimeout(timeout)
  }, [canSaveLog, log, logCloudReady, user])

  useEffect(() => {
    if (!plan.workouts.some((workout) => workout.id === selectedWorkoutId)) {
      setSelectedWorkoutId(plan.workouts[0]?.id ?? '')
    }
  }, [plan.workouts, selectedWorkoutId])

  const selectedWorkout =
    plan.workouts.find((workout) => workout.id === selectedWorkoutId) ?? null
  const exercisesCount = plan.workouts.reduce(
    (total, workout) => total + workout.exercises.length,
    0,
  )
  const trainingDayCount = new Set(
    plan.workouts.map((workout) => workout.day.split('·')[0].trim()),
  ).size
  const loadedExercises = plan.workouts.reduce(
    (total, workout) =>
      total + workout.exercises.filter(
        (exercise) => exercise.weightTracked !== false && exercise.weightKg > 0,
      ).length,
    0,
  )

  const saveWorkout = (workoutId: string, exercise: Exercise) => {
    setPlan((current) => ({
      ...current,
      workouts: current.workouts.map((workout) =>
        workout.id === workoutId
          ? withWorkoutExercise(workout, exercise)
          : workout,
      ),
    }))
  }

  const updateWorkout = (workoutId: string, updates: Partial<Workout>) => {
    setPlan((current) => ({
      ...current,
      workouts: current.workouts.map((workout) =>
        workout.id === workoutId ? { ...workout, ...updates } : workout,
      ),
    }))
  }

  const updateExercise = (
    workoutId: string,
    exerciseId: string,
    updates: Partial<Exercise>,
  ) => {
    const workout = plan.workouts.find((item) => item.id === workoutId)
    const exercise = workout?.exercises.find((item) => item.id === exerciseId)
    if (exercise) saveWorkout(workoutId, { ...exercise, ...updates })
  }

  const openExerciseEditor = (workoutId: string, exercise?: Exercise) => {
    setEditorWorkoutId(workoutId)
    setDraft(exercise ? { ...exercise } : newExercise())
    setEditorError(null)
  }

  const handleExerciseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || !editorWorkoutId) return

    if (draft.videoUrl) {
      try {
        const url = new URL(draft.videoUrl)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          setEditorError('Il link al video deve iniziare con https:// o http://.')
          return
        }
      } catch {
        setEditorError('Inserisci un link video valido oppure lascia il campo vuoto.')
        return
      }
    }

    saveWorkout(editorWorkoutId, {
      ...draft,
      name: draft.name.trim(),
      muscleGroup: draft.muscleGroup.trim() || 'Generale',
      instructions: draft.instructions.trim(),
      videoUrl: draft.videoUrl.trim() || videoSearchUrl(draft.name.trim()),
    })
    setEditorWorkoutId(null)
    setDraft(null)
  }

  const addWorkout = () => {
    const workout: Workout = {
      id: createId(),
      day: 'Nuovo giorno',
      title: 'Nuovo allenamento',
      focus: 'Aggiungi i tuoi esercizi',
      durationMinutes: 45,
      exercises: [],
      sections: [],
    }
    setPlan((current) => ({ ...current, workouts: [...current.workouts, workout] }))
    setSelectedWorkoutId(workout.id)
    setView('plan')
    setEditing(true)
  }

  const deleteWorkout = (workout: Workout) => {
    if (plan.workouts.length < 2) {
      setStorageMessage('La scheda deve contenere almeno un giorno di allenamento.')
      return
    }
    if (!window.confirm(`Eliminare la scheda "${workout.title}"?`)) return
    setPlan((current) => ({
      ...current,
      workouts: current.workouts.filter((item) => item.id !== workout.id),
    }))
  }

  const deleteExercise = (workoutId: string, exercise: Exercise) => {
    if (!window.confirm(`Eliminare "${exercise.name}" dalla scheda?`)) return
    updateWorkout(workoutId, {
      exercises:
        plan.workouts
          .find((workout) => workout.id === workoutId)
          ?.exercises.filter((item) => item.id !== exercise.id) ?? [],
      sections: (plan.workouts.find((workout) => workout.id === workoutId)?.sections ?? [])
        .map((section) => ({
          ...section,
          exerciseIds: section.exerciseIds.filter((id) => id !== exercise.id),
        })),
    })
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setAuthLoading(true)
    setAuthError(null)
    setAuthMessage(null)

    const result =
      authMode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

    setAuthLoading(false)
    if (result.error) {
      setAuthError(result.error.message)
      return
    }
    if (authMode === 'signup' && !result.data.session) {
      setAuthMessage('Account creato. Controlla la tua email per confermare l’indirizzo, poi accedi.')
      return
    }
    setAccountOpen(false)
    setPassword('')
  }

  const handleSignOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      setCloudStatus('error')
      setCloudMessage(`Non riesco a scollegare l’account: ${error.message}`)
      return
    }
    setAccountOpen(false)
  }

  const saveSession = (session: SessionLog) => {
    setLog((current) => ({ sessions: { ...current.sessions, [session.date]: session } }))
  }

  const deleteSession = (dateKey: string) => {
    setLog((current) => {
      const sessions = { ...current.sessions }
      delete sessions[dateKey]
      return { sessions }
    })
  }

  /** Chiude la sessione e porta nella scheda il carico più alto usato per ogni esercizio. */
  const finishSession = (dateKey: string) => {
    const session = log.sessions[dateKey]
    if (!session) return
    const finished = { ...session, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    saveSession(finished)
    setPlan((current) => ({
      ...current,
      workouts: current.workouts.map((workout) =>
        workout.id !== session.workoutId
          ? workout
          : {
              ...workout,
              exercises: workout.exercises.map((exercise) => {
                const entry = session.exercises[exercise.id]
                if (!entry || exercise.weightTracked === false) return exercise
                const top = Math.max(0, ...entry.sets.filter((set) => set.done).map((set) => set.weightKg ?? 0))
                return top > 0 ? { ...exercise, weightKg: top } : exercise
              }),
            },
      ),
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetLog = () => {
    if (!window.confirm('Azzerare lo storico illeggibile? Le serie salvate su questo dispositivo andranno perse.')) return
    setLog(emptyLog)
    setCanSaveLog(true)
    setStorageMessage(null)
  }

  const resetDemo = () => {
    try {
      clearStoredPlan()
    } catch {
      setStorageMessage('Non riesco a cancellare i dati salvati dal browser.')
      return
    }
    setPlan(initialPlan)
    setCanSave(true)
    setStorageMessage(null)
  }

  const visibleExercises = plan.workouts.flatMap((workout) =>
    workout.exercises.map((exercise) => ({ workout, exercise })),
  )
  const activeSections = selectedWorkout ? getWorkoutSections(selectedWorkout) : []
  const filteredExercises = visibleExercises.filter(({ workout, exercise }) =>
    `${exercise.name} ${exercise.muscleGroup} ${workout.title}`
      .toLocaleLowerCase('it-IT')
      .includes(search.toLocaleLowerCase('it-IT')),
  )

  const cloudLabel = !isCloudConfigured
    ? 'Solo su questo dispositivo'
    : cloudStatus === 'loading'
      ? 'Carico il piano…'
      : cloudStatus === 'saving'
        ? 'Sincronizzazione…'
        : cloudStatus === 'error'
          ? 'Sync da controllare'
          : user && cloudStatus === 'synced'
            ? 'Sincronizzato'
            : 'Attiva la sincronizzazione'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setView('today')}>
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>GYM TRAINING</strong>
            <small>HOCKEY PERFORMANCE</small>
          </span>
        </a>

        <div className="sidebar-label">IL TUO SPAZIO</div>
        <nav className="side-nav" aria-label="Navigazione principale">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              className={view === item.view ? 'nav-item active' : 'nav-item'}
              onClick={() => setView(item.view)}
              aria-current={view === item.view ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {view === item.view && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-note">
          <span className="note-icon"><Icon name="check" size={16} /></span>
          <strong>Ogni turno conta</strong>
          <p>Personalizza carichi e recuperi tra un allenamento e l’altro.</p>
        </div>

        <button className="account-button" onClick={() => setAccountOpen(true)}>
          <span className="avatar">{user ? user.email?.charAt(0).toUpperCase() : 'L'}</span>
          <span className="account-copy">
            <strong>{user?.email ?? 'Il mio account'}</strong>
            <small>{cloudLabel}</small>
          </span>
          <Icon name="cloud" size={17} />
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark" aria-hidden="true" />
            <strong>GYM TRAINING</strong>
          </div>
          <p className="today-date">{formatToday()}</p>
          <button
            className={`sync-pill ${cloudStatus === 'error' ? 'sync-error' : ''}`}
            onClick={() => setAccountOpen(true)}
            aria-label={`Sincronizzazione: ${cloudLabel}`}
          >
            <span className={`sync-dot ${cloudStatus}`} />
            <span>{cloudLabel}</span>
          </button>
        </header>

        <InstallHint />

        {storageMessage && (
          <div className="notice notice-warning" role="status">
            <span>{storageMessage}</span>
            {!canSave && (
              <button className="text-button" onClick={resetDemo}>Ripristina demo</button>
            )}
            {!canSaveLog && (
              <button className="text-button" onClick={resetLog}>Azzera storico</button>
            )}
          </div>
        )}
        {cloudMessage && (
          <div className="notice notice-warning" role="alert">
            <span>{cloudMessage}</span>
            <button className="icon-button" onClick={() => setCloudMessage(null)} aria-label="Chiudi avviso">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        <section className="page-heading">
          <div>
            <span className="eyebrow"><span className="eyebrow-dot" /> {HEADINGS[view].eyebrow}</span>
            <h1>{view === 'plan' ? plan.name : HEADINGS[view].title}</h1>
            <p>{HEADINGS[view].text}</p>
          </div>
          {view === 'today' || view === 'progress' ? null : view === 'plan' ? (
            <button
              className={editing ? 'button button-muted' : 'button button-outline'}
              onClick={() => setEditing((current) => !current)}
            >
              <Icon name={editing ? 'check' : 'edit'} size={17} />
              {editing ? 'Fine modifiche' : 'Modifica scheda'}
            </button>
          ) : (
            <label className="search-field">
              <Icon name="search" size={17} />
              <input
                type="search"
                placeholder="Cerca un esercizio"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          )}
        </section>

        {view === 'today' && (
          <TrainingView
            plan={plan}
            log={log}
            selectedDate={selectedDate}
            today={today}
            sections={getWorkoutSections}
            onSelectDate={setSelectedDate}
            onSaveSession={saveSession}
            onDeleteSession={deleteSession}
            onFinishSession={finishSession}
          />
        )}

        {view === 'progress' && (
          <ProgressView
            log={log}
            today={today}
            onOpenDate={(dateKey) => {
              setSelectedDate(dateKey)
              setView('today')
              window.scrollTo({ top: 0 })
            }}
          />
        )}

        {view === 'plan' && (
          <>
            <section className="welcome-card">
              <div className="welcome-copy">
              <span className="welcome-kicker">PROGRAMMA OFF-ICE · SABATO GARA</span>
                <h2>Costruisci la tua forma.<br /><span>Pronto per il prossimo turno.</span></h2>
                <p>
                Cinque giorni di lavoro e il lunedì alternato A/B. Imposta i
                carichi secondo il tuo livello.
                </p>
              <span className="demo-tag">● &nbsp; LUNEDÌ ALTERNATO · A / B</span>
              </div>
              <div className="welcome-art" aria-hidden="true">
                <div className="art-ring art-ring-one" />
                <div className="art-ring art-ring-two" />
                <div className="hockey-stick" />
                <div className="art-puck" />
                <div className="art-caption">LAVORO IN PALESTRA<br />PRONTI SUL GHIACCIO</div>
              </div>
            </section>

            <section className="stats-grid" aria-label="Riepilogo del piano">
              <article className="stat-card">
                <span className="stat-icon icon-lime"><Icon name="plan" size={17} /></span>
                <div><strong>{trainingDayCount}</strong><span>giorni di allenamento</span></div>
                <small>{plan.workouts.length} SESSIONI</small>
              </article>
              <article className="stat-card">
                <span className="stat-icon icon-peach"><Icon name="library" size={17} /></span>
                <div><strong>{exercisesCount}</strong><span>esercizi in scheda</span></div>
                <small>IN TOTALE</small>
              </article>
              <article className="stat-card">
                <span className="stat-icon icon-blue"><Icon name="edit" size={17} /></span>
                <div><strong>{loadedExercises}</strong><span>carichi impostati</span></div>
                <small>PERSONALI</small>
              </article>
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">IL TUO PROGRAMMA</span>
                  <h2>Settimana tipo</h2>
                </div>
                {editing && (
                  <button className="button button-dark button-small" onClick={addWorkout}>
                    <Icon name="plus" size={16} /> Aggiungi giorno
                  </button>
                )}
              </div>
              <div className="workout-tabs">
                {plan.workouts.map((workout, index) => (
                  <button
                    className={`workout-tab ${workout.id === selectedWorkoutId ? 'selected' : ''}`}
                    key={workout.id}
                    onClick={() => setSelectedWorkoutId(workout.id)}
                  >
                    <span className="tab-day">
                      {workout.day.includes('·')
                        ? `${workout.day.split('·')[0].trim().slice(0, 3).toUpperCase()} · ${workout.day.split('·').at(-1)?.trim()}`
                        : workout.day.slice(0, 3).toUpperCase()}
                    </span>
                    <span className="tab-title">{workout.title}</span>
                    <span className="tab-number">{String(index + 1).padStart(2, '0')}</span>
                  </button>
                ))}
                {plan.workouts.length === 0 && (
                  <div className="empty-inline">Aggiungi il primo giorno al tuo piano.</div>
                )}
              </div>
            </section>

            {selectedWorkout && (
              <section className="workout-panel">
                <div className="workout-panel-heading">
                  <div className="workout-title-wrap">
                    <span className="day-label">{selectedWorkout.day}</span>
                    {editing ? (
                      <div className="workout-title-fields">
                        <input
                          className="title-input"
                          aria-label="Nome della scheda"
                          value={selectedWorkout.title}
                          onChange={(event) => updateWorkout(selectedWorkout.id, { title: event.target.value })}
                        />
                        <input
                          className="focus-input"
                          aria-label="Gruppi muscolari"
                          value={selectedWorkout.focus}
                          onChange={(event) => updateWorkout(selectedWorkout.id, { focus: event.target.value })}
                        />
                        <input
                          className="day-input"
                          aria-label="Giorno della settimana"
                          value={selectedWorkout.day}
                          onChange={(event) => updateWorkout(selectedWorkout.id, { day: event.target.value })}
                        />
                        <label className="duration-edit">
                          <span>MIN</span>
                          <input
                            aria-label="Durata in minuti"
                            type="number"
                            min="10"
                            max="240"
                            value={selectedWorkout.durationMinutes}
                            onChange={(event) =>
                              updateWorkout(selectedWorkout.id, {
                                durationMinutes: Math.min(240, Math.max(10, Number(event.target.value) || 10)),
                              })
                            }
                          />
                        </label>
                      </div>
                    ) : (
                      <>
                        <h2>{selectedWorkout.title}</h2>
                        <p>{selectedWorkout.focus}</p>
                      </>
                    )}
                  </div>
                  <div className="workout-meta">
                    <span>{selectedWorkout.exercises.length} esercizi</span>
                    <span className="meta-divider" />
                    <span>~{selectedWorkout.durationMinutes} min</span>
                    {editing && (
                      <button
                        className="icon-button danger"
                        onClick={() => deleteWorkout(selectedWorkout)}
                        aria-label={`Elimina la scheda ${selectedWorkout.title}`}
                        title="Elimina giorno"
                      >
                        <Icon name="trash" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="exercise-list">
                  {activeSections.map((section) => {
                    const sectionExercises = section.exerciseIds
                      .map((id) => selectedWorkout.exercises.find((exercise) => exercise.id === id))
                      .filter((exercise): exercise is Exercise => exercise !== undefined)

                    return (
                      <section className="training-section" key={section.id}>
                        <div className="training-section-heading">
                          <span className="training-section-marker" />
                          <div className="training-section-title">
                            <h3>{section.title}</h3>
                            {section.description && <p>{section.description}</p>}
                          </div>
                          <span className="section-time">
                            {section.durationMinutes > 0 ? `${section.durationMinutes} min` : ''}
                          </span>
                        </div>
                        {section.rounds && (
                          <div className="rounds-note">
                            <strong>{section.rounds} GIRI</strong>
                            {section.restAfterRound && <span>RECUPERO {section.restAfterRound.toUpperCase()} A FINE GIRO</span>}
                          </div>
                        )}
                        {sectionExercises.map((exercise) => {
                          const index = selectedWorkout.exercises.findIndex(
                            (item) => item.id === exercise.id,
                          )
                          const tracksWeight = exercise.weightTracked !== false

                          return (
                            <article className="exercise-row" key={exercise.id}>
                              <span className="exercise-index">{String(index + 1).padStart(2, '0')}</span>
                              <div className="exercise-name">
                                <strong>{exercise.name}</strong>
                                <span>{exercise.muscleGroup}</span>
                              </div>
                              <div className="exercise-prescription">
                                <span className="prescription-value">{exercise.sets} <small>serie</small></span>
                                <span className="prescription-separator">×</span>
                                <span className="prescription-value">{exercise.reps}</span>
                                {exercise.restSeconds > 0 && (
                                  <span className="rest-value">Rec. {exercise.restSeconds}s</span>
                                )}
                              </div>
                              {tracksWeight ? (
                                <label className="weight-control">
                                  <span>CARICO</span>
                                  <span className="weight-input-wrap">
                                    <input
                                      aria-label={`Carico per ${exercise.name} in kg`}
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={exercise.weightKg}
                                      onChange={(event) =>
                                        updateExercise(selectedWorkout.id, exercise.id, {
                                          weightKg: Math.max(0, Number(event.target.value) || 0),
                                        })
                                      }
                                    />
                                    <small>kg</small>
                                  </span>
                                </label>
                              ) : (
                                <span className="bodyweight-label">CORPO LIBERO</span>
                              )}
                              <div className="exercise-actions">
                                <a
                                  className="video-link"
                                  href={exercise.videoUrl || videoSearchUrl(exercise.name)}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Cerca un video per ${exercise.name}`}
                                >
                                  <Icon name="external" size={15} />
                                  <span>Cerca video</span>
                                </a>
                                {editing && (
                                  <>
                                    <button
                                      className="icon-button"
                                      onClick={() => openExerciseEditor(selectedWorkout.id, exercise)}
                                      aria-label={`Modifica ${exercise.name}`}
                                      title="Modifica esercizio"
                                    >
                                      <Icon name="edit" size={16} />
                                    </button>
                                    <button
                                      className="icon-button danger"
                                      onClick={() => deleteExercise(selectedWorkout.id, exercise)}
                                      aria-label={`Elimina ${exercise.name}`}
                                      title="Elimina esercizio"
                                    >
                                      <Icon name="trash" size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                              <p className="exercise-instructions">{exercise.instructions}</p>
                            </article>
                          )
                        })}
                      </section>
                    )
                  })}
                  {selectedWorkout.exercises.length === 0 && (
                    <div className="empty-state">
                      <span className="empty-symbol"><Icon name="plus" size={21} /></span>
                      <strong>Questa scheda è ancora vuota</strong>
                      <p>Aggiungi il primo esercizio per iniziare a personalizzarla.</p>
                    </div>
                  )}
                </div>

                {editing && (
                  <button
                    className="add-exercise-button"
                    onClick={() => openExerciseEditor(selectedWorkout.id)}
                  >
                    <Icon name="plus" size={17} />
                    Aggiungi esercizio
                  </button>
                )}

                <div className="panel-footnote">
                  <span className="footnote-mark">i</span>
                  <span>
                    I carichi sono inizialmente a 0 kg: impostali in base al tuo livello.
                    Le indicazioni sono generali, non sostituiscono il parere di un professionista.
                  </span>
                </div>
              </section>
            )}

            <footer className="app-footer">
              <span>Costruita per allenarsi meglio, una modifica alla volta.</span>
              <button className="footer-link" onClick={() => setAccountOpen(true)}>
                <Icon name="cloud" size={15} /> {cloudLabel}
              </button>
            </footer>
          </>
        )}

        {view === 'library' && (
          <section className="library-section">
            <div className="library-summary">
              <div><span className="eyebrow">LA TUA RACCOLTA</span><h2>{filteredExercises.length} esercizi</h2></div>
              <p>Apri una scheda per modificare carichi, serie e descrizione.</p>
            </div>
            <div className="library-grid">
              {filteredExercises.map(({ workout, exercise }, index) => (
                <article className="library-card" key={`${workout.id}-${exercise.id}`}>
                  <div className="library-card-top">
                    <span className="library-card-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="muscle-tag">{exercise.muscleGroup}</span>
                  </div>
                  <h3>{exercise.name}</h3>
                  <p>{exercise.instructions || 'Aggiungi una descrizione dalla scheda di allenamento.'}</p>
                  <div className="library-card-meta">
                    <span>{workout.title}</span>
                    <span>{exercise.sets} × {exercise.reps}</span>
                  </div>
                  <div className="library-card-actions">
                    <a href={exercise.videoUrl || videoSearchUrl(exercise.name)} target="_blank" rel="noreferrer">
                      Cerca video <Icon name="external" size={14} />
                    </a>
                    <button
                      onClick={() => {
                        setSelectedWorkoutId(workout.id)
                        setView('plan')
                        setEditing(true)
                        openExerciseEditor(workout.id, exercise)
                      }}
                    >
                      Modifica <Icon name="arrow" size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {filteredExercises.length === 0 && (
              <div className="empty-state library-empty">
                <span className="empty-symbol"><Icon name="search" size={21} /></span>
                <strong>Nessun esercizio trovato</strong>
                <p>Prova una ricerca diversa o aggiungi esercizi dalle tue schede.</p>
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Navigazione mobile">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            className={view === item.view ? 'mobile-nav-item active' : 'mobile-nav-item'}
            onClick={() => setView(item.view)}
            aria-current={view === item.view ? 'page' : undefined}
          >
            <Icon name={item.icon} size={20} /><span>{item.short}</span>
          </button>
        ))}
      </nav>

      {draft && editorWorkoutId && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setDraft(null)
            setEditorWorkoutId(null)
          }
        }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title">
            <div className="modal-heading">
              <div>
                <span className="eyebrow">LA TUA SCHEDA</span>
                <h2 id="exercise-modal-title">{plan.workouts.find((item) => item.id === editorWorkoutId)?.exercises.some((item) => item.id === draft.id) ? 'Modifica esercizio' : 'Nuovo esercizio'}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setDraft(null)
                  setEditorWorkoutId(null)
                }}
                aria-label="Chiudi"
              >
                <Icon name="close" />
              </button>
            </div>
            <form className="exercise-form" onSubmit={handleExerciseSubmit}>
              <label className="form-field form-full">
                <span>Nome esercizio</span>
                <input
                  autoFocus
                  required
                  maxLength={70}
                  value={draft.name}
                  placeholder="Es. Rematore con manubrio"
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Gruppo muscolare</span>
                <input
                  maxLength={40}
                  value={draft.muscleGroup}
                  placeholder="Es. Schiena"
                  onChange={(event) => setDraft({ ...draft, muscleGroup: event.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Carico iniziale (kg)</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.weightKg}
                  onChange={(event) => setDraft({ ...draft, weightKg: Math.max(0, Number(event.target.value) || 0) })}
                />
              </label>
              <label className="form-field">
                <span>Serie</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={draft.sets}
                  onChange={(event) => setDraft({ ...draft, sets: Number(event.target.value) })}
                />
              </label>
              <label className="form-field">
                <span>Ripetizioni</span>
                <input
                  required
                  maxLength={20}
                  value={draft.reps}
                  onChange={(event) => setDraft({ ...draft, reps: event.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Recupero (secondi)</span>
                <input
                  type="number"
                  min="0"
                  max="900"
                  step="15"
                  value={draft.restSeconds}
                  onChange={(event) => setDraft({ ...draft, restSeconds: Number(event.target.value) })}
                />
              </label>
              <label className="form-field form-full">
                <span>Come si esegue</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={draft.instructions}
                  placeholder="Aggiungi qualche indicazione utile per ricordare il movimento."
                  onChange={(event) => setDraft({ ...draft, instructions: event.target.value })}
                />
              </label>
              <label className="form-field form-full">
                <span>Link a un video (facoltativo)</span>
                <input
                  type="url"
                  value={draft.videoUrl}
                  placeholder="https://..."
                  onChange={(event) => setDraft({ ...draft, videoUrl: event.target.value })}
                />
                <small>Se lasci il campo vuoto, troverai un collegamento per cercare video su YouTube.</small>
              </label>
              {editorError && <p className="form-error form-full" role="alert">{editorError}</p>}
              <div className="modal-actions form-full">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => {
                    setDraft(null)
                    setEditorWorkoutId(null)
                  }}
                >
                  Annulla
                </button>
                <button type="submit" className="button button-dark">
                  Salva esercizio <Icon name="check" size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {accountOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAccountOpen(false)
        }}>
          <section className="modal-card account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
            <div className="modal-heading">
              <div>
                <span className="eyebrow"><Icon name="cloud" size={13} /> SINCRONIZZAZIONE</span>
                <h2 id="account-modal-title">{user ? 'Il tuo account' : 'I tuoi allenamenti, ovunque'}</h2>
              </div>
              <button className="icon-button" onClick={() => setAccountOpen(false)} aria-label="Chiudi">
                <Icon name="close" />
              </button>
            </div>

            {!isCloudConfigured ? (
              <div className="cloud-setup">
                <p>
                  Per ora il piano è salvato in questo browser. Per sincronizzarlo
                  tra Mac e telefono, configureremo un account Supabase e un database privato.
                </p>
                <ol>
                  <li>Crea un progetto gratuito su <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com <Icon name="external" size={13} /></a>.</li>
                  <li>Copia l’URL del progetto e la chiave pubblica nel file <code>.env</code>.</li>
                  <li>Esegui una volta lo script <code>supabase/schema.sql</code> nel pannello SQL.</li>
                  <li>Riavvia l’app e crea qui il tuo account con email e password.</li>
                </ol>
                <div className="privacy-note"><Icon name="check" size={16} /> Ogni account può leggere e modificare solo il proprio piano.</div>
                <button className="button button-dark button-wide" onClick={() => setAccountOpen(false)}>Va bene, continuo in locale</button>
              </div>
            ) : user ? (
              <div className="signed-in-panel">
                <span className="avatar avatar-large">{user.email?.charAt(0).toUpperCase()}</span>
                <strong>{user.email}</strong>
                <p>{cloudStatus === 'synced' ? 'Il piano è sincronizzato con il cloud.' : cloudLabel}</p>
                <button className="button button-outline button-wide" onClick={() => void handleSignOut()}>Esci dall’account</button>
              </div>
            ) : (
              <form className="account-form" onSubmit={handleAuthSubmit}>
                <p>
                  {authMode === 'signin'
                    ? 'Accedi per continuare il tuo allenamento su tutti i tuoi dispositivi.'
                    : 'Crea un account per salvare il piano in modo sincronizzato.'}
                </p>
                <label className="form-field form-full">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className="form-field form-full">
                  <span>Password</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <small>Almeno 8 caratteri.</small>
                </label>
                {authError && <p className="form-error" role="alert">{authError}</p>}
                {authMessage && <p className="form-success" role="status">{authMessage}</p>}
                <button className="button button-dark button-wide" type="submit" disabled={authLoading}>
                  {authLoading ? 'Un momento…' : authMode === 'signin' ? 'Accedi e sincronizza' : 'Crea account'}
                  {!authLoading && <Icon name="arrow" size={16} />}
                </button>
                <button
                  className="text-button auth-switch"
                  type="button"
                  onClick={() => {
                    setAuthMode((mode) => mode === 'signin' ? 'signup' : 'signin')
                    setAuthError(null)
                    setAuthMessage(null)
                  }}
                >
                  {authMode === 'signin' ? 'Non hai un account? Creane uno' : 'Hai già un account? Accedi'}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App
