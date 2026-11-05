export type Exercise = {
  id: string
  name: string
  muscleGroup: string
  sets: number
  reps: string
  weightKg: number
  restSeconds: number
  instructions: string
  videoUrl: string
  weightTracked?: boolean
}

export type WorkoutSection = {
  id: string
  title: string
  description: string
  durationMinutes: number
  rounds?: number
  restAfterRound?: string
  exerciseIds: string[]
}

export type Workout = {
  id: string
  day: string
  title: string
  focus: string
  durationMinutes: number
  exercises: Exercise[]
  sections?: WorkoutSection[]
}

export type TrainingPlan = {
  name: string
  workouts: Workout[]
}
