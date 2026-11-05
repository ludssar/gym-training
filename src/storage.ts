import { initialPlan, isTrainingPlan } from './data'
import type { TrainingPlan } from './types'

const STORAGE_KEY = 'gym-training.plan.v1'

export type StoredPlan = {
  plan: TrainingPlan
  canSave: boolean
  warning: string | null
}

export function readStoredPlan(): StoredPlan {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return { plan: initialPlan, canSave: true, warning: null }

    const parsed: unknown = JSON.parse(saved)
    if (!isTrainingPlan(parsed)) {
      return {
        plan: initialPlan,
        canSave: false,
        warning: 'I dati salvati non sono leggibili. Ripristina la demo per poter salvare nuove modifiche.',
      }
    }

    return { plan: parsed, canSave: true, warning: null }
  } catch {
    return {
      plan: initialPlan,
      canSave: false,
      warning: 'Non riesco a leggere i dati salvati su questo dispositivo. Ripristina la demo per continuare.',
    }
  }
}

export function writeStoredPlan(plan: TrainingPlan) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
}

export function clearStoredPlan() {
  window.localStorage.removeItem(STORAGE_KEY)
}
