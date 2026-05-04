const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Inserisci qui la tua API KEY (in produzione usa le variabili d'ambiente es. process.env.GEMINI_API_KEY)
const GEMINI_API_KEY = 'AIzaSyDBcW-iDgAxKMPPLvK3VmZYc5_PLb2BF6k'; 

// Simulazione di un database in memoria per gli utenti
// In un ambiente reale useresti un database (MySQL, MongoDB, PostgreSQL)
const usersDb = {
    'tecnico1': { password: 'pwd', requests: 0, tokens: 0 },
    'teo': { password: '12321', requests: 0, tokens: 0 }
};

// Funzione spostata dal client al server per gestire la cascata dei modelli
async function callGeminiApiFallback(prompt) {
    const models = [
        { name: "3.1", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}` },
        { name: "2.5", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}` },
        { name: "1.5", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}` }
    ]; 
    
    let lastError = null;

    for (let i = 0; i < models.length; i++) {
        try {
            const response = await fetch(models[i].url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            const text = data.candidates[0].content.parts[0].text.trim();
            
            // I modelli Gemini più recenti restituiscono i token utilizzati in usageMetadata
            const totalTokenCount = data.usageMetadata?.totalTokenCount || 0;

            return { text, totalTokenCount, modelUsed: models[i].name };
        } catch (error) {
            console.warn(`Errore con il modello ${models[i].name}:`, error.message);
            lastError = error;
        }
    }
    throw lastError; // Se falliscono tutti, lancia l'ultimo errore
}

// Endpoint di Login per la validazione immediata nell'estensione
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = usersDb[username];
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, error: 'Credenziali non valide.' });
    }
    res.json({ success: true });
});

// Endpoint (ricevitore) per l'estensione
app.post('/api/generate', async (req, res) => {
    const { username, password, prompt } = req.body;

    // 1. Autenticazione utente
    const user = usersDb[username];
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, error: 'Credenziali non valide o utente inesistente.' });
    }

    try {
        // 2. Elaborazione AI
        const { text, totalTokenCount, modelUsed } = await callGeminiApiFallback(prompt);

        // 3. Statistiche e conteggi
        user.requests += 1;
        user.tokens += totalTokenCount;

        // Stampa a console sul server lo stato dell'utente
        console.log(`[${username}] Modello: ${modelUsed} | Token usati ora: ${totalTokenCount} | Token Totali: ${user.tokens} | Req Totali: ${user.requests}`);

        // 4. Restituzione risultati all'estensione
        res.json({ success: true, text: text });
    } catch (error) {
        console.error('Errore Elaborazione AI:', error);
        res.status(500).json({ success: false, error: 'Errore durante l\'elaborazione AI sui server Gemini.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server in ascolto sulla porta ${PORT}... Pronti a ricevere richieste!`);
});