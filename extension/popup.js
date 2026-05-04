// Impostazioni del Server 
const SERVER_URL = 'https://YOUR_BACKEND_DOMAIN/api/generate';
const LOGIN_URL = 'https://YOUR_BACKEND_DOMAIN/api/login';

let currentUser = '';
let currentPass = '';

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.getElementById('micBtn');
    const rewriteBtn = document.getElementById('rewriteBtn');
    const rewriteSelectedBtn = document.getElementById('rewriteSelectedBtn');
    const statusDiv = document.getElementById('status');

    // Elementi della vista di conferma
    const mainView = document.getElementById('main-view');
    const confirmationView = document.getElementById('confirmation-view');
    const suggestionTextarea = document.getElementById('suggestion-textarea');
    const confirmRewriteBtn = document.getElementById('confirm-rewrite-btn');
    const cancelRewriteBtn = document.getElementById('cancel-rewrite-btn');

    // Elementi di login
    const loginView = document.getElementById('login-view');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    // 1. Verifica se ci sono già credenziali salvate all'apertura del popup
    chrome.storage.local.get(['ai_username', 'ai_password'], (result) => {
        if (result.ai_username && result.ai_password) {
            currentUser = result.ai_username;
            currentPass = result.ai_password;
            loginView.style.display = 'none';
            mainView.style.display = 'block';
        } else {
            loginView.style.display = 'block';
            mainView.style.display = 'none';
        }
    });

    // 1.5 Gestione tasto Invio (Enter) nei campi di testo per il login
    const handleEnterKey = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Previene comportamenti indesiderati del browser
            loginBtn.click();
        }
    };
    usernameInput.addEventListener('keydown', handleEnterKey);
    passwordInput.addEventListener('keydown', handleEnterKey);

    // 2. Gestione pulsante Accedi
    loginBtn.addEventListener('click', async () => {
        const user = usernameInput.value.trim();
        const pass = passwordInput.value.trim();
        
        if (user && pass) {
            loginBtn.disabled = true;
            loginBtn.innerText = 'Verifica in corso...';
            loginError.style.display = 'none';
            
            try {
                const response = await fetch(LOGIN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, password: pass })
                });
                
                if (response.ok) {
                    chrome.storage.local.set({ 'ai_username': user, 'ai_password': pass }, () => {
                        currentUser = user;
                        currentPass = pass;
                        loginView.style.display = 'none';
                        mainView.style.display = 'block';
                    });
                } else if (response.status === 401) {
                    loginError.innerText = 'Username o password errati.';
                    loginError.style.display = 'block';
                } else {
                    loginError.innerText = `Errore dal server (Codice ${response.status}). Sicuro di aver riavviato il server?`;
                    loginError.style.display = 'block';
                }
            } catch (error) {
                loginError.innerText = 'Errore di connessione al server.';
                loginError.style.display = 'block';
            } finally {
                loginBtn.disabled = false;
                loginBtn.innerText = 'Accedi';
            }
        } else {
            loginError.innerText = 'Inserisci username e password.';
            loginError.style.display = 'block';
        }
    });

    // 3. Gestione pulsante Esci (Logout)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            chrome.storage.local.remove(['ai_username', 'ai_password'], () => {
                currentUser = '';
                currentPass = '';
                usernameInput.value = '';
                passwordInput.value = '';
                mainView.style.display = 'none';
                confirmationView.style.display = 'none';
                loginView.style.display = 'block';
            });
        });
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        statusDiv.innerText = "❌ Riconoscimento vocale non supportato.";
        micBtn.disabled = true;
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let targetElementId = null; // Memorizza l'ID del campo da modificare

    let isRecording = false;

    micBtn.addEventListener('click', () => {
        if (!isRecording) {
            recognition.start();
        } else {
            recognition.stop();
        }
    });

    recognition.onstart = () => {
        isRecording = true;
        micBtn.innerHTML = '🛑 In ascolto...';
        micBtn.style.backgroundColor = '#eab308'; // Giallo ambra per indicare l'ascolto
        statusDiv.innerText = "In ascolto... Parla ora 🎤";
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.innerHTML = '🎙️ Clicca e Parla';
        micBtn.style.backgroundColor = ''; // Rimuove il colore per far tornare quello del CSS
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        micBtn.disabled = true;
        micBtn.style.backgroundColor = '#f59e0b'; // Arancione più morbido

        statusDiv.innerText = `Voce acquisita. Inserimento in descrizione... ⏳`;
        await sendMessageToTab("insertDescription", transcript);

        statusDiv.innerText = `Elaborazione AI in corso... ⏳`;
        await processWithGemini(transcript);
        
        micBtn.disabled = false;
        micBtn.style.backgroundColor = ''; 
    };

    recognition.onerror = (event) => {
        statusDiv.innerText = "❌ Errore microfono: " + event.error;
        isRecording = false;
        micBtn.innerHTML = '🎙️ Riprova';
        micBtn.style.backgroundColor = ''; 
    };

    if (rewriteBtn) {
        rewriteBtn.addEventListener('click', () => {
            statusDiv.innerText = "Recupero il testo dal CRM... ⏳";
            rewriteBtn.disabled = true;
            if (micBtn) micBtn.disabled = true;
            if (rewriteSelectedBtn) rewriteSelectedBtn.disabled = true;

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "getText"}, async function(response) {
                    // Verifica se l'estensione riesce a comunicare con la pagina
                    if (chrome.runtime.lastError) {
                        statusDiv.innerText = "❌ Errore: assicurati di essere sul CRM Vtenext.";
                        rewriteBtn.disabled = false;
                        if (micBtn) micBtn.disabled = false;
                        if (rewriteSelectedBtn) rewriteSelectedBtn.disabled = false;
                        return;
                    }
                    
                    if (response && response.success) {
                        const existingText = response.text;
                        if (!existingText || existingText.trim() === '') {
                            statusDiv.innerText = "❌ Nessun testo trovato nel campo Descrizione.";
                        } else {
                            statusDiv.innerText = `Testo acquisito. Elaborazione AI in corso... ⏳`;
                            await processWithGemini(existingText);
                        }
                    } else {
                        statusDiv.innerText = "❌ Errore nel recupero o campo non trovato.";
                    }
                    rewriteBtn.disabled = false;
                    if (micBtn) micBtn.disabled = false;
                    if (rewriteSelectedBtn) rewriteSelectedBtn.disabled = false;
                });
            });
        });
    }

    if (rewriteSelectedBtn) {
        rewriteSelectedBtn.addEventListener('click', async () => {
            statusDiv.innerText = "Individuazione campo attivo... ⏳";
            rewriteBtn.disabled = true;
            micBtn.disabled = true;
            rewriteSelectedBtn.disabled = true;

            const response = await sendMessageToTab("getActiveElementText");

            if (response && response.success) {
                statusDiv.innerText = "Testo acquisito. Rielaboro... ⏳";
                const rewrittenText = await rewriteGenericText(response.text);
                
                targetElementId = response.elementId;
                suggestionTextarea.value = rewrittenText;
                mainView.style.display = 'none';
                confirmationView.style.display = 'block';
            } else {
                statusDiv.innerText = "❌ Nessun campo di testo selezionato.";
                // Non c'è bisogno di mostrare l'alert qui, lo fa già il content script
            }

            rewriteBtn.disabled = false;
            micBtn.disabled = false;
            rewriteSelectedBtn.disabled = false;
        });
    }

    // Gestione pulsanti di conferma/annulla
    confirmRewriteBtn.addEventListener('click', async () => {
        const finalText = suggestionTextarea.value;
        if (!finalText || !targetElementId) return;

        await sendMessageToTab("replaceTextById", { elementId: targetElementId, text: finalText });

        // Torna alla vista principale
        confirmationView.style.display = 'none';
        mainView.style.display = 'block';
        statusDiv.innerText = '✅ Testo sostituito con successo!';
        targetElementId = null; // Resetta l'ID
    });

    cancelRewriteBtn.addEventListener('click', () => {
        // Torna alla vista principale
        confirmationView.style.display = 'none';
        mainView.style.display = 'block';
        statusDiv.innerText = 'Operazione annullata.';
        targetElementId = null; // Resetta l'ID
    });


    // Funzione centralizzata che adesso comunica esclusivamente col nostro Server
    async function callGeminiApi(prompt, statusDiv) {
        try {
            const response = await fetch(SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: currentUser,
                    password: currentPass,
                    prompt: prompt 
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                if (response.status === 401) {
                    // Se il server risponde "Non Autorizzato", svuota le credenziali e avvisa
                    chrome.storage.local.remove(['ai_username', 'ai_password']);
                    alert("Credenziali errate o modificate sul server. Effettua nuovamente il login.");
                    window.close(); // Chiude il popup
                }
                throw new Error(data.error || 'Errore dal server remoto');
            }

            return data.text;
        } catch (error) {
            console.error("Errore di comunicazione col server:", error);
            statusDiv.innerText = "❌ Errore di connessione col server o AI non disponibile.";
            throw error;
        }
    }

    function sendMessageToTab(action, text) {
        return new Promise((resolve) => {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: action, text: text}, function(response) {
                    resolve(response);
                });
            });
        });
    }

    async function processWithGemini(transcript) {
        const todayDate = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        const prompt = `Sei un assistente AI esperto in IT Service Management.
Analizza il seguente resoconto fornito da un tecnico e restituisci ESCLUSIVAMENTE un oggetto JSON valido con le seguenti chiavi:
1. "clean_solution": Il testo della soluzione rielaborato in tono formale e professionale. Rimuovi imprecazioni e commenti personali. IMPORTANTE: Rimuovi dal testo finale in questa variabile qualsiasi riferimento al tempo impiegato, allo stato del ticket, alla data di chiusura e al nome del cliente.
2. "hours": Le ore impiegate convertite in formato decimale (es. "mezz'ora" -> "0.5", "un'ora e mezza" -> "1.5"). Se non menzionato, usa null.
3. "status": Lo stato del ticket dedotto dal testo. Scegli ESATTAMENTE tra: "Aperto", "In Corso", "In Attesa Risposta", "Risposto dal cliente", "Chiuso", "Aperto - in attesa di materiale". Se non deducibile, usa null.
4. "closing_date": SE lo stato è "Chiuso", inserisci la data specificata (formato dd-mm-yyyy). Se è "Chiuso" ma non c'è la data, usa la data di oggi: "${todayDate}". Altrimenti usa null.
5. "client_name": Il nome del cliente menzionato nel testo (es. "Campitelli", "Rossi"). Se non menzionato, usa null.

Restituisci SOLO il JSON, senza formattazioni Markdown (come \`\`\`json).

RESOCONTO DEL TECNICO: "${transcript}"`;

        try {
            const generatedText = await callGeminiApi(prompt, statusDiv);
            
            // Pulisce eventuali markdown sfuggiti e parsa il JSON
            const cleanJsonString = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJsonString);

            statusDiv.innerText = "✅ Dati estratti! Incollo nel CRM...";
            
            const response = await sendMessageToTab("insertText", data.clean_solution);
            
            if (response && response.success) {
                if (data.hours !== null && data.hours !== undefined) {
                    await sendMessageToTab("insertHours", String(data.hours));
                }
                if (data.status) {
                    await sendMessageToTab("insertStatus", data.status);
                    if (data.closing_date && data.status.trim().toLowerCase().includes('chiuso')) {
                        // Attendi 800ms: quando lo stato passa a "Chiuso", il CRM potrebbe metterci una frazione di secondo per sbloccare/mostrare il campo data
                        await new Promise(r => setTimeout(r, 800));
                        await sendMessageToTab("insertClosingDate", data.closing_date);
                    }
                }

                statusDiv.innerText = "Generazione titolo... ⏳";
                const generatedTitle = await generateTitleWithGemini(data.clean_solution);
                await sendMessageToTab("insertTitle", generatedTitle);

                statusDiv.innerText = "Scelta tipologia... ⏳";
                const generatedCategory = await generateCategoryWithGemini(data.clean_solution);
                await sendMessageToTab("insertCategory", generatedCategory);

                if (data.client_name) {
                    statusDiv.innerText = "Inserimento cliente... ⏳";
                    await sendMessageToTab("insertClient", data.client_name);
                }

                statusDiv.innerText = "✅ Operazione completata! Puoi chiudere.";
            }
        } catch (error) {
            console.error("Dettagli errore Gemini:", error);
            statusDiv.innerText = "❌ Errore parsing AI: Riprova l'elaborazione.";
        }
    }

    async function generateTitleWithGemini(solutionText) {
        const prompt = `Genera un titolo professionale per questo intervento IT.
Regole: Max 5-7 parole, no punto finale, solo testo tecnico (es: "Sostituzione RAM PC Amministrazione").
Restituisci esclusivamente il titolo senza virgolette o preamboli.

Intervento: "${solutionText}"`;

        return await callGeminiApi(prompt, statusDiv);
    }

    async function generateCategoryWithGemini(solutionText) {
        const prompt = `Classifica il seguente intervento IT in UNA di queste categorie esatte:
- Casse
- Demo
- Formazione
- Gestionali
- Hardware & Software
- Macchine Ufficio
- Negozio
- Reso
- Servizi
- Visita

Intervento: "${solutionText}"
Regole: Restituisci ESCLUSIVAMENTE il nome esatto della categoria. Nient'altro. Se non sei sicuro, scegli "Hardware & Software".`;

        return await callGeminiApi(prompt, statusDiv);
    }

    async function rewriteGenericText(text) {
        const prompt = `Riscrivi il seguente testo in modo più professionale, chiaro e conciso.
Correggi eventuali errori grammaticali o di battitura.
Restituisci solo il testo riscritto, senza aggiungere introduzioni o commenti.

TESTO ORIGINALE: "${text}"`;
        return await callGeminiApi(prompt, statusDiv);
    }
});