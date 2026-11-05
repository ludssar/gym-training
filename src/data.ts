import type {
  Exercise,
  TrainingPlan,
  Workout,
  WorkoutSection,
} from './types'

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function videoSearchUrl(exerciseName: string) {
  const query = encodeURIComponent(`${exerciseName} esecuzione corretta`)
  return `https://www.youtube.com/results?search_query=${query}`
}

type ExerciseInput = {
  name: string
  muscleGroup: string
  sets: number
  reps: string
  instructions: string
  restSeconds?: number
  weightTracked?: boolean
}

type SectionInput = {
  title: string
  description: string
  durationMinutes: number
  exercises: Exercise[]
  rounds?: number
  restAfterRound?: string
}

function exercise({
  name,
  muscleGroup,
  sets,
  reps,
  instructions,
  restSeconds = 90,
  weightTracked = true,
}: ExerciseInput): Exercise {
  return {
    id: createId(),
    name,
    muscleGroup,
    sets,
    reps,
    weightKg: 0,
    restSeconds,
    instructions,
    videoUrl: videoSearchUrl(name),
    weightTracked,
  }
}

function section({
  title,
  description,
  durationMinutes,
  exercises,
  rounds,
  restAfterRound,
}: SectionInput): WorkoutSection {
  return {
    id: createId(),
    title,
    description,
    durationMinutes,
    rounds,
    restAfterRound,
    exerciseIds: exercises.map((item) => item.id),
  }
}

function workout(
  day: string,
  title: string,
  focus: string,
  durationMinutes: number,
  sections: WorkoutSection[],
  exercises: Exercise[],
): Workout {
  return { id: createId(), day, title, focus, durationMinutes, sections, exercises }
}

const warmup = (
  name: string,
  reps: string,
  instructions: string,
  sets = 1,
): Exercise =>
  exercise({
    name,
    muscleGroup: 'Riscaldamento',
    sets,
    reps,
    instructions,
    restSeconds: 0,
    weightTracked: false,
  })

const mondayAccessories = () => ({
  dips: exercise({
    name: 'Dip alle parallele',
    muscleGroup: 'Petto · tricipiti',
    sets: 3,
    reps: '8',
    instructions: 'Esegui le ripetizioni con controllo e un’escursione confortevole.',
    restSeconds: 90,
  }),
  extension: exercise({
    name: 'Leg extension',
    muscleGroup: 'Quadricipiti',
    sets: 3,
    reps: '10–12',
    instructions: 'Estendi le gambe con controllo e mantieni il busto appoggiato alla macchina.',
    restSeconds: 90,
  }),
  plank: exercise({
    name: 'Plank zavorrato',
    muscleGroup: 'Core',
    sets: 3,
    reps: '45 sec',
    instructions: 'Posiziona il disco in alto sulle scapole, mantieni il corpo allineato e interrompi se perdi la posizione.',
    restSeconds: 60,
  }),
})

const mondayAccessorySet = mondayAccessories()
const mondayAExercises = [
  warmup('Mobilità anca e caviglia', 'Movimenti controllati', 'Mobilizza anche e caviglie in modo progressivo, senza forzare l’escursione.'),
  warmup('Squat a corpo libero: serie di avvicinamento', 'A corpo libero', 'Esegui due serie per preparare il movimento e avvicinarti gradualmente allo squat con bilanciere.', 2),
  exercise({
    name: 'Squat pesante con bilanciere',
    muscleGroup: 'Quadricipiti · glutei',
    sets: 4,
    reps: '4–5',
    instructions: 'Parte del complex bilaterale: esegui lo squat, poi passa subito allo squat jump. Usa un carico gestibile e una tecnica stabile.',
    restSeconds: 0,
  }),
  exercise({
    name: 'Squat jump a corpo libero',
    muscleGroup: 'Pliometria · gambe',
    sets: 4,
    reps: '5',
    instructions: 'Eseguilo subito dopo lo squat pesante, senza pausa. Salta in modo esplosivo e atterra con controllo; il recupero di 2 min 30 sec è a fine giro.',
    restSeconds: 150,
    weightTracked: false,
  }),
  mondayAccessorySet.dips,
  mondayAccessorySet.extension,
  mondayAccessorySet.plank,
]
const mondayASections = [
  section({
    title: 'Riscaldamento',
    description: '5 min · mobilità e serie di avvicinamento.',
    durationMinutes: 5,
    exercises: mondayAExercises.slice(0, 2),
  }),
  section({
    title: 'Complex training bilaterale',
    description: 'Squat + salto · 4 giri · 0 sec tra i due esercizi · recupero 2 min 30 sec a fine giro.',
    durationMinutes: 15,
    rounds: 4,
    restAfterRound: '2 min 30 sec',
    exercises: mondayAExercises.slice(2, 4),
  }),
  section({
    title: 'Dip alle parallele',
    description: '3 serie · recupero 90 sec.',
    durationMinutes: 8,
    exercises: [mondayAExercises[4]],
  }),
  section({
    title: 'Leg extension',
    description: '3 serie · recupero 90 sec.',
    durationMinutes: 8,
    exercises: [mondayAExercises[5]],
  }),
  section({
    title: 'Plank zavorrato',
    description: '3 serie · recupero 60 sec.',
    durationMinutes: 6,
    exercises: [mondayAExercises[6]],
  }),
]

const mondayBExercises = [
  warmup('Mobilità anca e caviglia', 'Movimenti controllati', 'Mobilizza anche e caviglie in modo progressivo, senza forzare l’escursione.'),
  warmup('Apertura dinamica dell’anca', 'Aperture controllate', 'Esegui aperture dinamiche controllate per preparare l’anca al lavoro monolaterale.'),
  exercise({
    name: 'Bulgarian split squat con manubri',
    muscleGroup: 'Gambe · monolaterale',
    sets: 4,
    reps: '4 per gamba',
    instructions: 'Parte del complex monolaterale: pausa di 2 sec in basso, poi passa subito allo split jump. Mantieni equilibrio e controllo.',
    restSeconds: 0,
  }),
  exercise({
    name: 'Split jump esplosivo',
    muscleGroup: 'Pliometria · monolaterale',
    sets: 4,
    reps: '4 per gamba',
    instructions: 'Eseguilo subito dopo il Bulgarian split squat. Atterra con controllo; recupera 2 min 30 sec prima di cambiare gamba o iniziare la serie successiva.',
    restSeconds: 150,
    weightTracked: false,
  }),
  exercise({
    name: 'Dip alle parallele',
    muscleGroup: 'Petto · tricipiti',
    sets: 3,
    reps: '8',
    instructions: 'Esegui le ripetizioni con controllo e un’escursione confortevole.',
    restSeconds: 90,
  }),
  exercise({
    name: 'Leg extension',
    muscleGroup: 'Quadricipiti',
    sets: 3,
    reps: '10–12',
    instructions: 'Estendi le gambe con controllo e mantieni il busto appoggiato alla macchina.',
    restSeconds: 90,
  }),
  exercise({
    name: 'Plank zavorrato',
    muscleGroup: 'Core',
    sets: 3,
    reps: '45 sec',
    instructions: 'Posiziona il disco in alto sulle scapole, mantieni il corpo allineato e interrompi se perdi la posizione.',
    restSeconds: 60,
  }),
]
const mondayBSections = [
  section({
    title: 'Riscaldamento',
    description: '5 min · mobilità di anca e caviglia e aperture dinamiche.',
    durationMinutes: 5,
    exercises: mondayBExercises.slice(0, 2),
  }),
  section({
    title: 'Complex training monolaterale',
    description: 'Bulgarian split squat + split jump · 4 giri per gamba · 0 sec tra i due esercizi · recupero 2 min 30 sec prima di cambiare gamba o ripartire.',
    durationMinutes: 18,
    rounds: 4,
    restAfterRound: '2 min 30 sec',
    exercises: mondayBExercises.slice(2, 4),
  }),
  section({
    title: 'Dip alle parallele',
    description: '3 serie · recupero 90 sec.',
    durationMinutes: 8,
    exercises: [mondayBExercises[4]],
  }),
  section({
    title: 'Leg extension',
    description: '3 serie · recupero 90 sec.',
    durationMinutes: 8,
    exercises: [mondayBExercises[5]],
  }),
  section({
    title: 'Plank zavorrato',
    description: '3 serie · disco alto sulle scapole · recupero 60 sec.',
    durationMinutes: 6,
    exercises: [mondayBExercises[6]],
  }),
]

const tuesdayExercises = [
  warmup('Mobilità della cuffia dei rotatori con elastico', 'Mobilità controllata', 'Muovi le spalle senza dolore e con tensione leggera dell’elastico.'),
  warmup('Rotazioni scapolari', 'Rotazioni controllate', 'Esegui circonduzioni scapolari fluide, senza compensare con la zona lombare.'),
  exercise({
    name: 'Panca piana con bilanciere',
    muscleGroup: 'Petto · forza',
    sets: 4,
    reps: '4',
    instructions: 'Nel complex petto e pliometria: spingi il bilanciere con la massima velocità mantenendo il controllo, poi passa subito ai push-up pliometrici.',
    restSeconds: 0,
  }),
  exercise({
    name: 'Push-up pliometrici',
    muscleGroup: 'Petto · potenza',
    sets: 4,
    reps: '4',
    instructions: 'Eseguili subito dopo ogni serie di panca, staccando brevemente le mani da terra. Recupera 2 min a fine giro.',
    restSeconds: 120,
  }),
  exercise({
    name: 'Military press in piedi con bilanciere',
    muscleGroup: 'Spalle',
    sets: 4,
    reps: '5',
    instructions: 'Addominali e glutei contratti; spingi verso l’alto in modo esplosivo senza inarcare la schiena.',
    restSeconds: 90,
  }),
  exercise({
    name: 'Pushdown tricipiti alla lat machine',
    muscleGroup: 'Tricipiti',
    sets: 3,
    reps: '10',
    instructions: 'Usa corda o barra; mantieni i gomiti vicino al busto e controlla il ritorno.',
    restSeconds: 90,
  }),
  exercise({
    name: 'Chest launch con pietra',
    muscleGroup: 'Potenza · spinta',
    sets: 4,
    reps: '5 lanci',
    instructions: 'In piedi, piedi a larghezza spalle e pietra all’altezza del petto. Fai un micro-caricamento sulle gambe e lancia in avanti con decisione. Usa solo un’area dedicata e libera da persone e ostacoli, con un bersaglio adatto; non lanciare verso persone, pareti non protette o attrezzatura. Recupera 60–90 sec e usa un peso che controlli.',
    restSeconds: 75,
  }),
]
const tuesdaySections = [
  section({
    title: 'Riscaldamento',
    description: '5 min · mobilità della cuffia dei rotatori con elastico e rotazioni scapolari.',
    durationMinutes: 5,
    exercises: tuesdayExercises.slice(0, 2),
  }),
  section({
    title: 'Complex training: petto e pliometria',
    description: 'Panca + push-up pliometrici · 4 giri · 0 sec tra gli esercizi · recupero 2 min a fine giro.',
    durationMinutes: 12,
    rounds: 4,
    restAfterRound: '2 min',
    exercises: tuesdayExercises.slice(2, 4),
  }),
  section({
    title: 'Military press in piedi',
    description: '4 serie · recupero 90 sec.',
    durationMinutes: 10,
    exercises: [tuesdayExercises[4]],
  }),
  section({
    title: 'Pushdown tricipiti alla lat machine',
    description: '3 serie · corda o barra · recupero 90 sec.',
    durationMinutes: 8,
    exercises: [tuesdayExercises[5]],
  }),
  section({
    title: 'Finisher: lanci esplosivi dal petto',
    description: '4 × 5 lanci · recupero 60–90 sec · ogni ripetizione esplosiva.',
    durationMinutes: 0,
    exercises: [tuesdayExercises[6]],
  }),
]

const wednesdayExercises = [
  warmup('Mobilità toracica: aperture e gatto-cammello', 'Movimenti controllati', 'Alterna aperture toraciche e mobilità della colonna con un ritmo comodo.'),
  warmup('Attivazione dorsale', 'Attivazione leggera', 'Attiva la muscolatura dorsale prima delle trazioni senza affaticarti.'),
  exercise({
    name: 'Trazioni alla sbarra presa larga prona',
    muscleGroup: 'Dorsali',
    sets: 4,
    reps: '5–7',
    instructions: 'Fase di salita esplosiva e discesa controllata; usa un’assistenza se serve per mantenere una tecnica solida.',
    restSeconds: 120,
  }),
  exercise({
    name: 'Rematore con bilanciere',
    muscleGroup: 'Schiena',
    sets: 4,
    reps: '6–8',
    instructions: 'Busto inclinato a circa 45°, bilanciere da terra o che sfiora terra; tira verso il ventre mantenendo il busto stabile.',
    restSeconds: 90,
  }),
  exercise({
    name: 'Landmine twist con bilanciere',
    muscleGroup: 'Core · rotazione',
    sets: 4,
    reps: '6–8 per lato',
    instructions: 'Impugna l’estremità a due mani con braccia quasi tese. Traccia un arco da un’anca all’altra, facendo perno sui piedi e ruotando le anche per trasferire la forza dalla gamba posteriore, come in uno slapshot.',
    restSeconds: 75,
  }),
  exercise({
    name: 'Lanci rotazionali esplosivi con pietra',
    muscleGroup: 'Potenza · rotazione',
    sets: 4,
    reps: '4 lanci per lato',
    instructions: 'Carica la gamba posteriore e lancia in orizzontale esplodendo in avanti. Esegui i lanci solo in un’area dedicata e libera da persone e ostacoli, verso un bersaglio adatto. Mantieni 90 sec di recupero.',
    restSeconds: 90,
  }),
  exercise({
    name: 'Farmer’s walk con manubri pesanti',
    muscleGroup: 'Presa · avambracci',
    sets: 2,
    reps: '30 sec',
    instructions: 'Cammina con manubri che puoi controllare, busto alto e passi stabili.',
    restSeconds: 60,
  }),
  exercise({
    name: 'Plate pinch: tenuta a pinza',
    muscleGroup: 'Presa · avambracci',
    sets: 2,
    reps: '30 sec',
    instructions: 'Trattieni due dischi con la presa a pinza per il tempo previsto, senza farli scivolare.',
    restSeconds: 60,
  }),
]
const wednesdaySections = [
  section({
    title: 'Riscaldamento',
    description: '5 min · mobilità toracica e attivazione dorsale.',
    durationMinutes: 5,
    exercises: wednesdayExercises.slice(0, 2),
  }),
  section({
    title: 'Trazioni alla sbarra',
    description: '4 serie · presa larga prona · recupero 2 min.',
    durationMinutes: 12,
    exercises: [wednesdayExercises[2]],
  }),
  section({
    title: 'Rematore con bilanciere',
    description: '4 serie · recupero 90 sec.',
    durationMinutes: 10,
    exercises: [wednesdayExercises[3]],
  }),
  section({
    title: 'Landmine twist',
    description: '3–4 serie per lato · recupero 60–90 sec.',
    durationMinutes: 8,
    exercises: [wednesdayExercises[4]],
  }),
  section({
    title: 'Lanci rotazionali con pietra',
    description: '4 serie · 4 lanci orizzontali per lato · recupero 90 sec.',
    durationMinutes: 8,
    exercises: [wednesdayExercises[5]],
  }),
  section({
    title: 'Finisher: presa e avambracci',
    description: '2 serie per esercizio · recupero 60 sec.',
    durationMinutes: 7,
    exercises: wednesdayExercises.slice(6),
  }),
]

const thursdayExercises = [
  warmup('Slanci controllati per femorali', '10 per gamba', 'Slanci dinamici controllati, senza rimbalzi e senza forzare il fine corsa.', 2),
  warmup('Mobilità flessori dell’anca in affondo', '8 per lato', 'In posizione di affondo, mobilizza i flessori mantenendo il busto stabile.', 2),
  warmup('Rotazioni e circonduzioni del bacino', '10 per lato', 'Muovi il bacino con circonduzioni ampie ma confortevoli.', 2),
  exercise({
    name: 'Stiff-legged deadlift con bilanciere',
    muscleGroup: 'Catena posteriore',
    sets: 3,
    reps: '8',
    instructions: 'Nel tri-set, controlla la discesa per 3–4 sec, fai una pausa di 1 sec nel punto di massimo allungamento e risali in modo deciso. Pausa di 10 sec prima dell’esercizio seguente.',
    restSeconds: 10,
  }),
  exercise({
    name: 'Hanging leg raise alla sbarra',
    muscleGroup: 'Core',
    sets: 3,
    reps: '12',
    instructions: 'Solleva le ginocchia al petto o le gambe tese; controlla la discesa senza dondolare. Pausa di 10 sec prima del plank.',
    restSeconds: 10,
    weightTracked: false,
  }),
  exercise({
    name: 'Plank isometrico',
    muscleGroup: 'Core',
    sets: 3,
    reps: '60 sec',
    instructions: 'A corpo libero o con disco da 5–10 kg alto sulle scapole. Mantieni il corpo allineato; recupera 90 sec alla fine del giro.',
    restSeconds: 90,
  }),
  exercise({
    name: 'Panca inclinata con manubri',
    muscleGroup: 'Petto',
    sets: 3,
    reps: '8',
    instructions: 'Panca inclinata a 30°–45°; controlla la discesa e spingi con decisione.',
    restSeconds: 90,
  }),
  exercise({
    name: 'Leg extension di richiamo',
    muscleGroup: 'Quadricipiti',
    sets: 3,
    reps: '12',
    instructions: 'Mantieni una spremitura isometrica di 1 sec alla massima estensione.',
    restSeconds: 90,
  }),
  exercise({
    name: 'Banded face pull',
    muscleGroup: 'Postura · cuffia dei rotatori',
    sets: 3,
    reps: '12',
    instructions: 'Ancora l’elastico in alto. Tira verso la fronte separando le mani ed extraruotando i gomiti.',
    restSeconds: 60,
  }),
]
const thursdaySections = [
  section({
    title: 'Riscaldamento',
    description: '5 min · mobilità dinamica di femorali, anche e bacino.',
    durationMinutes: 5,
    exercises: thursdayExercises.slice(0, 3),
  }),
  section({
    title: 'Tri-set: catena posteriore e core',
    description: '3 giri · 10 sec tra gli esercizi · recupero 90 sec alla fine di ogni giro.',
    durationMinutes: 15,
    rounds: 3,
    restAfterRound: '90 sec',
    exercises: thursdayExercises.slice(3, 6),
  }),
  section({
    title: 'Panca inclinata con manubri',
    description: '3 serie · panca a 30°–45° · recupero 90 sec.',
    durationMinutes: 8,
    exercises: [thursdayExercises[6]],
  }),
  section({
    title: 'Leg extension di richiamo',
    description: '3 serie · 1 sec di contrazione in alto · recupero 90 sec.',
    durationMinutes: 8,
    exercises: [thursdayExercises[7]],
  }),
  section({
    title: 'Finisher: postura e cuffia dei rotatori',
    description: '3 serie · recupero 60 sec.',
    durationMinutes: 8,
    exercises: [thursdayExercises[8]],
  }),
]

const fridayExercises = [
  warmup('World’s greatest stretch', '5 per lato', 'Esegui un affondo basso e aggiungi una rotazione toracica controllata.', 2),
  warmup('Aperture d’anca dinamiche', '8 per lato', 'Mobilità dinamica dell’anca con movimenti fluidi.', 2),
  warmup('Mobilità caviglie alla parete', '8 per lato', 'Porta il ginocchio in avanti verso la parete mantenendo il tallone a terra.', 2),
  exercise({
    name: 'Pull-through leggero con elastico',
    muscleGroup: 'Attivazione',
    sets: 2,
    reps: '10',
    instructions: 'Usa un elastico leggero per attivare la catena posteriore e le spalle; non cercare affaticamento.',
    restSeconds: 0,
    weightTracked: false,
  }),
  exercise({
    name: 'Ankle pogo hops reattivi',
    muscleGroup: 'Attivazione neurale',
    sets: 2,
    reps: '6',
    instructions: 'Saltelli rapidi sulle punte con caviglie reattive e rigide; ricerca elasticità senza accumulare fatica.',
    restSeconds: 0,
    weightTracked: false,
  }),
  exercise({
    name: 'Push-up pliometrici',
    muscleGroup: 'Attivazione neurale',
    sets: 2,
    reps: '4',
    instructions: 'Spinta secca per staccare leggermente le mani da terra, senza arrivare a fatica.',
    restSeconds: 0,
    weightTracked: false,
  }),
  exercise({
    name: 'Foam roller: quadricipiti',
    muscleGroup: 'Rilassamento',
    sets: 1,
    reps: '60 sec',
    instructions: 'Un passaggio controllato sul distretto, senza pressione dolorosa.',
    restSeconds: 0,
    weightTracked: false,
  }),
  exercise({
    name: 'Foam roller: femorali',
    muscleGroup: 'Rilassamento',
    sets: 1,
    reps: '60 sec',
    instructions: 'Un passaggio controllato sul distretto, senza pressione dolorosa.',
    restSeconds: 0,
    weightTracked: false,
  }),
  exercise({
    name: 'Foam roller: banda ileo-tibiale',
    muscleGroup: 'Rilassamento',
    sets: 1,
    reps: '60 sec',
    instructions: 'Un passaggio controllato sul distretto, senza pressione dolorosa.',
    restSeconds: 0,
    weightTracked: false,
  }),
  exercise({
    name: 'Foam roller: tratto toracico',
    muscleGroup: 'Rilassamento',
    sets: 1,
    reps: '60 sec',
    instructions: 'Un passaggio controllato sul tratto toracico, senza forzare la colonna.',
    restSeconds: 0,
    weightTracked: false,
  }),
]
const fridaySections = [
  section({
    title: 'Mobilità dinamica e decompressione',
    description: '10 min · mobilità di anche, caviglie e colonna; attivazione leggera.',
    durationMinutes: 10,
    exercises: fridayExercises.slice(0, 4),
  }),
  section({
    title: 'Attivazione neurale esplosiva',
    description: '5 min · segnale rapido al sistema nervoso, senza accumulare fatica.',
    durationMinutes: 5,
    exercises: fridayExercises.slice(4, 6),
  }),
  section({
    title: 'Rilassamento e miorilassamento',
    description: '5 min · un passaggio da 60 sec per ogni distretto.',
    durationMinutes: 5,
    exercises: fridayExercises.slice(6),
  }),
]

export const initialPlan: TrainingPlan = {
  name: 'Gym Training',
  workouts: [
    workout(
      'Lunedì · A',
      'Focus bilaterale',
      'Squat + salto · 50 min',
      50,
      mondayASections,
      mondayAExercises,
    ),
    workout(
      'Lunedì · B',
      'Focus monolaterale',
      'Bulgaro + salto · 50 min',
      50,
      mondayBSections,
      mondayBExercises,
    ),
    workout('Martedì', 'Spinta esplosiva', 'Military press · finisher d’impatto', 50, tuesdaySections, tuesdayExercises),
    workout('Mercoledì', 'Trazione & rotazione', 'Schiena · potenza rotazionale · grip', 50, wednesdaySections, wednesdayExercises),
    workout('Giovedì', 'Catena posteriore & core', 'Core avanzato · cuffia dei rotatori', 50, thursdaySections, thursdayExercises),
    workout('Venerdì', 'Scarico pre-gara', 'Attivazione neurale · max 20 min', 20, fridaySections, fridayExercises),
  ],
}

export function isTrainingPlan(value: unknown): value is TrainingPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<TrainingPlan>
  if (typeof plan.name !== 'string' || !Array.isArray(plan.workouts)) return false

  return plan.workouts.every((workoutValue) => {
    if (!workoutValue || typeof workoutValue !== 'object') return false
    const item = workoutValue as Partial<Workout>
    return (
      typeof item.id === 'string' &&
      typeof item.day === 'string' &&
      typeof item.title === 'string' &&
      typeof item.focus === 'string' &&
      typeof item.durationMinutes === 'number' &&
      Array.isArray(item.exercises) &&
      item.exercises.every((exerciseValue) => {
        if (!exerciseValue || typeof exerciseValue !== 'object') return false
        const entry = exerciseValue as Partial<Exercise>
        return (
          typeof entry.id === 'string' &&
          typeof entry.name === 'string' &&
          typeof entry.muscleGroup === 'string' &&
          typeof entry.sets === 'number' &&
          typeof entry.reps === 'string' &&
          typeof entry.weightKg === 'number' &&
          typeof entry.restSeconds === 'number' &&
          typeof entry.instructions === 'string' &&
          typeof entry.videoUrl === 'string' &&
          (entry.weightTracked === undefined || typeof entry.weightTracked === 'boolean')
        )
      }) &&
      (item.sections === undefined ||
        (Array.isArray(item.sections) &&
          item.sections.every((sectionValue) => {
            if (!sectionValue || typeof sectionValue !== 'object') return false
            const block = sectionValue as Partial<WorkoutSection>
            return (
              typeof block.id === 'string' &&
              typeof block.title === 'string' &&
              typeof block.description === 'string' &&
              typeof block.durationMinutes === 'number' &&
              Array.isArray(block.exerciseIds) &&
              block.exerciseIds.every((id) => typeof id === 'string') &&
              (block.rounds === undefined || typeof block.rounds === 'number') &&
              (block.restAfterRound === undefined || typeof block.restAfterRound === 'string')
            )
          })))
    )
  })
}
