# Gym Training

App personale per tenere le schede di allenamento, aggiornare i carichi e consultare le indicazioni degli esercizi. Il piano iniziale è organizzato per hockey su ghiaccio e l'interfaccia si adatta a Mac e telefono.

## Avvio sul Mac

Serve Node.js 20 o successivo. Nella cartella del progetto esegui:

```sh
npm install
npm run dev
```

Poi apri nel browser l'indirizzo mostrato da Vite (di solito `http://localhost:5173`).

Per provare l'interfaccia anche sul telefono mentre è collegato alla stessa rete Wi-Fi:

```sh
npm run dev -- --host 0.0.0.0
```

Apri sul telefono l'indirizzo di rete locale indicato da Vite. In questa modalità i dati salvati nel browser del Mac e quelli del telefono sono separati.

## Dati e sincronizzazione

Senza configurazione cloud, il piano viene salvato nel browser del dispositivo. Per sincronizzare i dispositivi:

1. Crea un progetto Supabase e copia il suo Project URL e la chiave pubblica (anon/publishable).
2. Nella cartella del progetto copia `.env.example` in `.env` e inserisci i due valori.
3. Nel pannello Supabase apri SQL Editor ed esegui `supabase/schema.sql` (se l'avevi già eseguito, rieseguilo: ora crea anche la tabella dello storico allenamenti).
4. Riavvia `npm run dev` e crea un account dall'app.

Le variabili reali `.env` non vanno condivise o aggiunte a Git. La chiave pubblica è usata dal browser insieme alle policy Row Level Security incluse nello schema: ogni utente autenticato può leggere e aggiornare soltanto il proprio piano. Non inserire mai una chiave `service_role` nell'app.

## Programma iniziale

- Cinque giorni di allenamento e sei sessioni, con lunedì alternato A/B.
- Riscaldamenti, complex, tri-set e finisher raccolti in blocchi con durata e recuperi.
- Pesi iniziali a 0 kg, da impostare personalmente.

## Funzioni incluse

- **Allenamento**: calendario mensile; scegli il giorno e l'app propone l'allenamento previsto (il lunedì alterna A/B in base all'ultimo fatto). Per ogni serie inserisci kg e ripetizioni e la spunti; una barra mostra l'avanzamento.
- **Sessione precedente**: nei campi compaiono in trasparenza i carichi e le rep dell'ultima volta. Se avevi chiuso tutte le serie allo stesso peso, l'app suggerisce di aumentare (+2,5 kg, +2 kg con i manubri, +1 kg sotto i 20 kg). Spuntando una serie senza scrivere nulla vengono salvati i valori in trasparenza.
- **Carico ridotto**: se in una serie scrivi un peso più basso, viene evidenziata e conta nel confronto successivo.
- **Termina allenamento**: salva la sessione, mostra eventuali record e aggiorna il carico in scheda con il più alto usato.
- **Progressi**: resoconto generale (esercizi in crescita, stabili, fermi, in calo), volume settimanale e, per ogni esercizio, andamento del 1RM stimato con lo storico delle serie.
- Modifica di giorni, esercizi, serie, ripetizioni, recupero e carichi.
- Libreria filtrabile, istruzioni scritte e collegamenti per cercare video degli esercizi.
- Salvataggio locale e sincronizzazione Supabase facoltativa.

I carichi dimostrativi partono da 0 kg e non sono una prescrizione di allenamento. Le indicazioni sono generali.
