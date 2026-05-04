// Vtenext CRM - AI Assistant Content Script
console.log("VTENext AI Assistant in ascolto...");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertText") {
        const targetTextarea = document.getElementById('cf_3p5_1581');
        
        if (targetTextarea) {
            targetTextarea.value = request.text;
            
            // Simula la digitazione per far capire alla pagina web che il campo è stato modificato
            targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            targetTextarea.dispatchEvent(new Event('change', { bubbles: true }));
            
            sendResponse({ success: true });
        } else {
            alert("Assicurati di avere il Ticket Vtenext aperto. Impossibile trovare il campo Soluzione.");
            sendResponse({ success: false });
        }
    } else if (request.action === "insertDescription") {
        const targetDescription = document.getElementById('description');
        
        if (targetDescription) {
            targetDescription.value = request.text;
            targetDescription.dispatchEvent(new Event('input', { bubbles: true }));
            targetDescription.dispatchEvent(new Event('change', { bubbles: true }));
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
        }
    } else if (request.action === "insertTitle") {
        const targetTitle = document.getElementById('ticket_title');
        
        if (targetTitle) {
            targetTitle.value = request.text;
            
            targetTitle.dispatchEvent(new Event('input', { bubbles: true }));
            targetTitle.dispatchEvent(new Event('change', { bubbles: true }));
            
            sendResponse({ success: true });
        } else {
            alert("Assicurati di avere il Ticket Vtenext aperto. Impossibile trovare il campo Titolo (ticket_title).");
            sendResponse({ success: false });
        }
    } else if (request.action === "insertCategory") {
        const targetCategory = document.getElementById('cf_3p5_1435');
        
        if (targetCategory) {
            let optionFound = false;
            for (let i = 0; i < targetCategory.options.length; i++) {
                if (targetCategory.options[i].text.trim().toLowerCase() === request.text.trim().toLowerCase()) {
                    targetCategory.selectedIndex = i;
                    optionFound = true;
                    break;
                }
            }
            if (!optionFound) targetCategory.value = request.text; // Fallback d'emergenza
            
            targetCategory.dispatchEvent(new Event('change', { bubbles: true }));
            sendResponse({ success: true });
        } else {
            alert("Assicurati di avere il Ticket Vtenext aperto. Impossibile trovare il campo Tipologia.");
            sendResponse({ success: false });
        }
    } else if (request.action === "insertHours") {
        const targetHours = document.getElementById('hours');
        if (targetHours) {
            targetHours.value = request.text;
            targetHours.dispatchEvent(new Event('input', { bubbles: true }));
            targetHours.dispatchEvent(new Event('change', { bubbles: true }));
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
        }
    } else if (request.action === "insertStatus") {
        const targetStatus = document.getElementById('ticketstatus');
        if (targetStatus) {
            let optionFound = false;
            for (let i = 0; i < targetStatus.options.length; i++) {
                if (targetStatus.options[i].text.trim().toLowerCase() === request.text.trim().toLowerCase()) {
                    targetStatus.selectedIndex = i;
                    optionFound = true;
                    break;
                }
            }
            if (!optionFound) targetStatus.value = request.text;
            targetStatus.dispatchEvent(new Event('change', { bubbles: true }));
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
        }
    } else if (request.action === "insertClosingDate") {
        const targetDate = document.getElementById('jscal_field_cf_3p5_1529');
        if (targetDate) {
            targetDate.focus();
            targetDate.value = request.text;
            targetDate.dispatchEvent(new Event('input', { bubbles: true }));
            targetDate.dispatchEvent(new Event('change', { bubbles: true }));
            targetDate.dispatchEvent(new Event('blur', { bubbles: true })); // Vtenext spesso richiede il blur per la validazione della data
            targetDate.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', keyCode: 13 }));
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
        }
    } else if (request.action === "insertClient") {
        const targetClient = document.getElementById('accountid_display');
        if (targetClient) {
            targetClient.focus();
            targetClient.click(); // A volte è necessario il click per attivare la UI del CRM
            targetClient.value = request.text;
            targetClient.dispatchEvent(new Event('input', { bubbles: true }));
            // Molti script di autocompletamento si innescano solo al rilascio di un tasto
            targetClient.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a', keyCode: 65 }));
            targetClient.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a', keyCode: 65 })); 
            targetClient.dispatchEvent(new Event('change', { bubbles: true }));
            sendResponse({ success: true });
        } else {
            alert("Assicurati di avere il Ticket Vtenext aperto. Impossibile trovare il campo Cliente.");
            sendResponse({ success: false });
        }
    } else if (request.action === "getText") {
        const targetTextarea = document.getElementById('description');
        if (targetTextarea) {
            sendResponse({ success: true, text: targetTextarea.value });
        } else {
            alert("Assicurati di avere il Ticket Vtenext aperto. Impossibile trovare il campo Descrizione (description).");
            sendResponse({ success: false });
        }
    } else if (request.action === "getActiveElementText") {
        const activeElement = document.activeElement;
        // Controlla che sia un campo di testo editabile e che abbia un ID
        if (activeElement && (activeElement.tagName.toLowerCase() === 'textarea' || (activeElement.tagName.toLowerCase() === 'input' && /text|search|email|url|tel/.test(activeElement.type))) && activeElement.id) {
            sendResponse({ success: true, text: activeElement.value, elementId: activeElement.id });
        } else {
            alert('Per favore, clicca prima su un campo di testo modificabile (come Descrizione o Soluzione) prima di usare questa funzione.');
            sendResponse({ success: false, error: 'Nessun campo di testo valido selezionato o il campo non ha un ID.' });
        }
    } else if (request.action === "replaceTextById") {
        const elementId = request.text.elementId;
        const newText = request.text.text;
        const targetElement = document.getElementById(elementId);

        if (targetElement) {
            targetElement.value = newText;
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
            targetElement.dispatchEvent(new Event('change', { bubbles: true }));
            sendResponse({ success: true });
        } else {
            alert(`Errore: Impossibile trovare l'elemento con ID "${elementId}".`);
            sendResponse({ success: false, error: `Element with ID ${elementId} not found.` });
        }
    }
    return true; // Necessario per l'invio asincrono delle risposte
});