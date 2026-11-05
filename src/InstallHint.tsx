import { useEffect, useState } from 'react'
import { Icon } from './Icon'

type InstallPromptEvent = Event & { prompt: () => Promise<void> }

const DISMISS_KEY = 'gym-training.install-hint.dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function wasDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Suggerisce di aggiungere l'app alla schermata Home quando è aperta dal browser del telefono. */
export function InstallHint() {
  const [visible, setVisible] = useState(
    () => !isStandalone() && !wasDismissed() && window.matchMedia('(max-width: 820px)').matches,
  )
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!visible || (!isIos && !installEvent)) return null

  const dismiss = () => {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Se il browser non salva, il suggerimento ricomparirà: nessun problema.
    }
  }

  return (
    <div className="install-hint" role="note">
      <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={40} height={40} />
      <div>
        <strong>Usala come un’app</strong>
        {isIos ? (
          <span>Tocca <b>Condividi</b> in Safari e poi <b>Aggiungi alla schermata Home</b>.</span>
        ) : (
          <span>Aggiungila alla schermata Home: si apre a schermo intero e funziona anche senza rete.</span>
        )}
      </div>
      {installEvent && (
        <button
          className="button button-dark button-small"
          onClick={() => {
            void installEvent.prompt().finally(() => setInstallEvent(null))
          }}
        >
          Installa
        </button>
      )}
      <button className="icon-button" onClick={dismiss} aria-label="Chiudi suggerimento">
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
