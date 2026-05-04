# Smart CRM Agent - vtenext Enhancer

Estensione per Chrome dedicata all'ecosistema **vtenext**, progettata per l'ottimizzazione del workflow tecnico e della gestione ticket. Lo strumento permette di convertire input rapidi o note vocali in descrizioni professionali e strutturate direttamente all'interno del CRM.

## Caratteristiche principali

* **Elaborazione Input:** Trasformazione di note grezze in linguaggio tecnico formale tramite modelli linguistici.
* **Automazione Ticket:** Supporto alla compilazione dei campi per garantire uniformità nei log di assistenza.
* **Miglioramento Testuale:** Funzione di revisione attivabile su qualsiasi campo di testo del CRM.
* **Reportistica e Fatturazione:** Generazione di descrizioni dettagliate per gli interventi, ottimizzando la precisione dei report di fatturazione.

## Architettura del sistema

La soluzione è suddivisa in due componenti:

1. **/extension**: Frontend dell'estensione (Manifest V3) che gestisce l'iniezione di script e l'interfaccia utente nel browser.
2. **/server**: Proxy backend basato su Node.js. Gestisce l'autenticazione e le chiamate verso le API AI, garantendo la sicurezza delle chiavi di accesso.

## Sicurezza e Configurazione

* **API Management:** Le chiavi segrete non sono esposte nel codice client ma gestite tramite variabili d'ambiente (ENV) lato server.
* **Autenticazione:** L'accesso alle funzionalità è vincolato alle credenziali del sistema proprietario.
* **Target:** Compatibile esclusivamente con vtenext CRM.

## Stack Tecnico

* **Client:** JavaScript (Chrome Extension API), HTML5, CSS3.
* **Server:** Node.js, Express.
* **AI:** Integrazione con LLM tramite endpoint sicuri.

## Configurazione

* Inserisci la tua **GEMINI_API_KEY**.
* Aggiorna l'URL nel file **popup.js** e **manifest.js** dell'estensione per puntare al tuo server.
---
*Tool per l'ottimizzazione dei flussi di lavoro tecnici e la qualità del dato aziendale.*
