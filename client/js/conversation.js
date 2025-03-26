// Gestione della conversazione per la valutazione
console.log('Conversation module loaded');

// Gestore centralizzato per l'ID paziente
const patientIdManager = {
    get: function() {
        // Recupera l'ID paziente da tutte le possibili fonti
        let patientId = null;
        
        // 1. Verifica in appState.currentPatient
        if (appState && appState.currentPatient && appState.currentPatient._id) {
            patientId = appState.currentPatient._id;
            console.log('[PatientID] Trovato in appState.currentPatient:', patientId);
        }
        // 2. Verifica in appState.conversationState
        else if (appState && appState.conversationState && appState.conversationState.patientId) {
            patientId = appState.conversationState.patientId;
            console.log('[PatientID] Trovato in appState.conversationState:', patientId);
        }
        // 3. Verifica in localStorage
        else if (localStorage.getItem('currentPatientId')) {
            patientId = localStorage.getItem('currentPatientId');
            console.log('[PatientID] Trovato in localStorage:', patientId);
        }
        
        if (!patientId) {
            console.error('[PatientID] ID paziente non trovato in nessuna fonte!');
        }
        
        return patientId;
    },
    
    set: function(patientId) {
        if (!patientId) {
            console.error('[PatientID] Tentativo di salvare un ID paziente nullo o vuoto');
            return;
        }
        
        // Salva l'ID paziente in tutte le posizioni rilevanti
        console.log('[PatientID] Salvataggio ID paziente:', patientId);
        
        // 1. Salva in localStorage
        localStorage.setItem('currentPatientId', patientId);
        
        // 2. Salva in appState.currentPatient se esiste
        if (appState && appState.currentPatient) {
            appState.currentPatient._id = patientId;
        }
        
        // 3. Salva in appState.conversationState se esiste
        if (appState && appState.conversationState) {
            appState.conversationState.patientId = patientId;
        }
    },
    
    ensureValid: async function() {
        // Assicura che ci sia un ID paziente valido, creandone uno se necessario
        let patientId = this.get();
        
        if (!patientId) {
            console.warn('[PatientID] Nessun ID paziente trovato, creazione di un paziente demo...');
            
            try {
                // Crea un paziente demo
                const patientData = {
                    firstName: 'Paziente',
                    lastName: 'Demo',
                    age: 40
                };
                
                const newPatient = await patientsAPI.create(patientData);
                patientId = newPatient._id;
                
                console.log('[PatientID] Paziente demo creato con ID:', patientId);
                this.set(patientId);
            } catch (error) {
                console.error('[PatientID] Errore nella creazione del paziente demo:', error);
                
                // Usa un ID fittizio come ultima risorsa
                patientId = `demo-patient-${Date.now()}`;
                this.set(patientId);
            }
        }
        
        return patientId;
    }
};

// Rendi disponibile globalmente
window.patientIdManager = patientIdManager;

// Inizializza la conversazione con l'assistente virtuale
async function initializeConversation() {
    try {
        // Assicurati di avere un ID paziente valido
        const patientId = await patientIdManager.ensureValid();
        
        console.log('Inizializzazione conversazione', appState.currentPatient);

        // Verifica che ci sia un paziente corrente
        if (!appState.currentPatient) {
            console.error('Nessun paziente selezionato');
            throw new Error('Nessun paziente selezionato');
        }

        // Mostra indicatore di caricamento
        toggleLoading(true, 'conversationScreen');

        // Pulisci i messaggi precedenti
        document.getElementById('chatMessages').innerHTML = '';
        document.getElementById('responseOptionsContainer').innerHTML = '';

        // Mostra la schermata di conversazione
        screenManager.show('conversationScreen');

        try {
            // Avvia la conversazione tramite l'API
const conversationResponse = await conversationAPI.start({
    patientName: `${appState.currentPatient.firstName} ${appState.currentPatient.lastName}`,
    patientAge: appState.currentPatient.age || 0,
    patientId: appState.currentPatient._id
});

            console.log('Risposta conversazione:', conversationResponse);

            // Nascondi indicatore di caricamento
            toggleLoading(false, 'conversationScreen');

            // Salva lo stato della conversazione
            appState.conversationState = conversationResponse.conversationState;

            // Mostra il primo messaggio di benvenuto
            const patientName = appState.currentPatient ? 
                `${appState.currentPatient.firstName}` : 'Paziente';
                
            addChatMessage('assistant', `Buongiorno, sono EmoBial e vorrei farti alcune brevi domande per capire meglio come ti senti. Le tue domande saranno riservate e serviranno solo per aiutare il medico a capire meglio il tuo stato emotivo. Possiamo iniziare?`);

        } catch (error) {
            console.error('Errore nella richiesta di conversazione:', error);
            
            // Nascondi indicatore di caricamento
            toggleLoading(false, 'conversationScreen');
            
            // Fallback per il messaggio di benvenuto
            const patientName = appState.currentPatient ? 
                `${appState.currentPatient.firstName}` : 'Paziente';
            
            addChatMessage('assistant', `Buongiorno, sono EmoBial e vorrei farti alcune brevi domande per capire meglio come ti senti. Le tue domande saranno riservate e serviranno solo per aiutare il medico a capire meglio il tuo stato emotivo. Possiamo iniziare?`);
            
            // Inizializza lo stato della conversazione manualmente
            appState.conversationState = {
                currentScale: 'GAD-7',
                currentQuestionIndex: 0,
                messages: [],
                scores: {
                    'GAD-7': Array(7).fill(null),
                    'PHQ-9': Array(9).fill(null)
                },
                patientId: patientId // Aggiungi l'ID paziente
            };
        }

        // Prepara le opzioni di risposta
        renderResponseOptions([
            { text: 'Continua', questionId: 'start', score: 0 }
        ]);
    } catch (error) {
        console.error('Errore nell\'inizializzazione della conversazione:', error);
        
        // Nascondi indicatore di caricamento
        toggleLoading(false, 'conversationScreen');
        
        // Usa la modalità demo se c'è un errore
        demoConversation();
    }
}

// Conversazione in modalità demo per fallback
function demoConversation() {
    console.log('Avvio conversazione in modalità demo');
    
    // Pulisci i messaggi precedenti
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('responseOptionsContainer').innerHTML = '';
    
    // Mostra la schermata di conversazione
    screenManager.show('conversationScreen');
    
    // Mostra il messaggio di benvenuto
    const patientName = appState.currentPatient ? 
        `${appState.currentPatient.firstName}` : 'Paziente';
    
    addChatMessage('assistant', `Buongiorno, sono EmoBial e vorrei farti alcune brevi domande per capire meglio come ti senti. Le tue domande saranno riservate e serviranno solo per aiutare il medico a capire meglio il tuo stato emotivo. Possiamo iniziare?`);
    
    // Inizializza lo stato della conversazione manualmente
    appState.conversationState = {
        currentScale: 'GAD-7',
        currentQuestionIndex: 0,
        messages: [],
        scores: {
            'GAD-7': Array(7).fill(null),
            'PHQ-9': Array(9).fill(null)
        }
    };
    
    // Aggiungi l'ID del paziente allo stato della conversazione usando il gestore
    const patientId = patientIdManager.get();
    if (patientId) {
        appState.conversationState.patientId = patientId;
        console.log('ID paziente aggiunto a conversationState (demo):', patientId);
    } else {
        // Crea un ID paziente valido se necessario
        patientIdManager.ensureValid().then(id => {
            appState.conversationState.patientId = id;
            console.log('Nuovo ID paziente creato e aggiunto a conversationState (demo):', id);
        });
    }
    
    // Prepara le opzioni di risposta
    renderResponseOptions([
        { text: 'Continua', questionId: 'start', score: 0 }
    ]);
}

// Aggiunge un messaggio alla chat
function addChatMessage(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `chat-message-${sender}`);
    messageElement.innerHTML = `
        <div class="message-content">
            ${message}
        </div>
    `;
    chatMessages.appendChild(messageElement);
    
    // Scorri automaticamente verso il basso
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Renderizza le opzioni di risposta
function renderResponseOptions(options) {
    const responseOptionsContainer = document.getElementById('responseOptionsContainer');
    if (!responseOptionsContainer) return;
    
    responseOptionsContainer.innerHTML = '';
    
    // Crea il contenitore per le opzioni standard
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'standard-options mb-3';
    
    options.forEach(option => {
        const optionButton = document.createElement('button');
        optionButton.classList.add('btn', 'btn-outline-primary', 'm-1');
        optionButton.textContent = option.text;
        optionButton.addEventListener('click', () => handleUserResponse(option));
        
        optionsContainer.appendChild(optionButton);
    });
    
    responseOptionsContainer.appendChild(optionsContainer);
    
    // Aggiungi il pulsante "Spiegami meglio" solo se non è il pulsante iniziale
    if (options.length > 1 && options[0].questionId !== 'start') {
        const explainButton = document.createElement('button');
        explainButton.classList.add('btn', 'btn-outline-secondary', 'mt-2', 'w-100');
        explainButton.innerHTML = '<i class="fas fa-question-circle me-1"></i> Spiegami meglio questa domanda';
        explainButton.addEventListener('click', () => requestExplanation(options[0].questionId));
        
        responseOptionsContainer.appendChild(explainButton);
    }
}

// Funzione per richiedere una spiegazione
async function requestExplanation(questionId) {
    try {
        // Mostra che l'utente ha richiesto una spiegazione
        addChatMessage('user', 'Puoi spiegarmi meglio questa domanda?');
        
        // Mostra indicatore di caricamento
        document.getElementById('responseOptionsContainer').innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
        
        // Chiama l'API per ottenere una spiegazione
        const explanation = await conversationAPI.explainQuestion(
            appState.conversationState,
            questionId
        );
        
        // Mostra la spiegazione ricevuta dall'API (che potrebbe essere un fallback)
        addChatMessage('assistant', explanation.message);
        
        // Ripristina le opzioni di risposta
        renderResponseOptions([
            { text: 'Mai (0)', questionId: questionId, score: 0 },
            { text: 'Alcuni giorni (1)', questionId: questionId, score: 1 },
            { text: 'Più della metà dei giorni (2)', questionId: questionId, score: 2 },
            { text: 'Quasi ogni giorno (3)', questionId: questionId, score: 3 }
        ]);
    } catch (error) {
        console.error('Errore nel richiedere una spiegazione:', error);
        
        // Fornisci una spiegazione standard in caso di errore imprevisto
        addChatMessage('assistant', 'Questa domanda valuta la frequenza con cui hai sperimentato questo sintomo nelle ultime due settimane. Considera tutte le situazioni in cui hai provato questa sensazione, anche di breve durata o intensità variabile.');
        
        // Ripristina le opzioni di risposta
        renderResponseOptions([
            { text: 'Mai (0)', questionId: questionId, score: 0 },
            { text: 'Alcuni giorni (1)', questionId: questionId, score: 1 },
            { text: 'Più della metà dei giorni (2)', questionId: questionId, score: 2 },
            { text: 'Quasi ogni giorno (3)', questionId: questionId, score: 3 }
        ]);
    }
}

// Gestione delle risposte dell'utente
async function handleUserResponse(selectedOption) {
    try {
        console.log('Opzione selezionata:', selectedOption);

        // Se è il pulsante iniziale, ottieni la prima domanda
        if (selectedOption.questionId === 'start') {
            // Aggiungi la risposta dell'utente alla chat
            addChatMessage('user', selectedOption.text);
            
            // Mostra indicatore di caricamento
            document.getElementById('responseOptionsContainer').innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
            
            try {
                // Assicurati che l'ID del paziente sia nello stato della conversazione
                const patientId = patientIdManager.get();
                if (patientId && appState.conversationState) {
                    appState.conversationState.patientId = patientId;
                }
                
                const nextQuestionResponse = await conversationAPI.getNextQuestion(
                    appState.conversationState
                );
                
                console.log('Prossima domanda:', nextQuestionResponse);

                // Aggiorna lo stato della conversazione
                appState.conversationState = nextQuestionResponse.conversationState;
                
                // Assicurati che l'ID del paziente sia mantenuto
                if (patientId) {
                    appState.conversationState.patientId = patientId;
                }

                // Semplifica la domanda per rimuovere frasi rassicuranti
                const questionText = simplifyQuestion(nextQuestionResponse.message);
                
                // Mostra il messaggio della domanda
                addChatMessage('assistant', questionText);
                
                // Renderizza le nuove opzioni di risposta
                renderResponseOptions([
                    { text: 'Mai (0)', questionId: nextQuestionResponse.questionId, score: 0 },
                    { text: 'Alcuni giorni (1)', questionId: nextQuestionResponse.questionId, score: 1 },
                    { text: 'Più della metà dei giorni (2)', questionId: nextQuestionResponse.questionId, score: 2 },
                    { text: 'Quasi ogni giorno (3)', questionId: nextQuestionResponse.questionId, score: 3 }
                ]);
            } catch (error) {
                console.error('Errore nel richiedere la prima domanda:', error);
                
                // Fallback alla prima domanda GAD-7
                const fallbackQuestion = getNextFallbackQuestion(appState.conversationState);
                addChatMessage('assistant', fallbackQuestion.questionText);
                
                // Renderizza le opzioni di risposta
                renderResponseOptions([
                    { text: 'Mai (0)', questionId: fallbackQuestion.questionId, score: 0 },
                    { text: 'Alcuni giorni (1)', questionId: fallbackQuestion.questionId, score: 1 },
                    { text: 'Più della metà dei giorni (2)', questionId: fallbackQuestion.questionId, score: 2 },
                    { text: 'Quasi ogni giorno (3)', questionId: fallbackQuestion.questionId, score: 3 }
                ]);
            }
            
            return;
        }

        // Aggiungi la risposta dell'utente alla chat
        addChatMessage('user', selectedOption.text);

        // Disabilita le opzioni durante l'elaborazione
        document.getElementById('responseOptionsContainer').innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';

        try {
            // Assicurati che l'ID del paziente sia nello stato della conversazione
            const patientId = patientIdManager.get();
            if (patientId && appState.conversationState) {
                appState.conversationState.patientId = patientId;
            }
            
            // Invia la risposta al backend
            const processResponse = await conversationAPI.processResponse(
                appState.conversationState, 
                selectedOption.questionId, 
                selectedOption.score
            );

            console.log('Risposta processata:', processResponse);

            // Aggiorna lo stato della conversazione
            appState.conversationState = processResponse.conversationState;
            
            // Assicurati che l'ID del paziente sia mantenuto
            if (patientId) {
                appState.conversationState.patientId = patientId;
            }

            // Aggiungi sempre la risposta standard
            addChatMessage('assistant', 'Grazie per la tua risposta, passiamo ora alla domanda successiva.');

            // Controlla se ci sono risultati finali
            if (processResponse.results) {
                console.log('Risultati finali:', processResponse.results);
                console.log('appState completo:', appState);
                console.log('currentPatient disponibile:', appState && appState.currentPatient ? 'SÌ' : 'NO');
                
                // Salva i risultati nell'app state
                appState.currentAssessment = processResponse.results;
                
                // Verifica e recupera l'ID paziente usando il gestore centralizzato
                const patientId = await patientIdManager.ensureValid();
                
                // Se abbiamo trovato un ID paziente, procedi con il salvataggio
                if (patientId) {
                    await saveAssessment(patientId);
                } else {
                    // Se non abbiamo trovato un ID, mostra comunque la schermata di transizione
                    setTimeout(() => {
                        screenManager.show('transitionToDoctorScreen');
                    }, 1500);
                }
                
                return; // Esci dalla funzione
            }

            // Se non sono risultati finali, ottieni la prossima domanda
            try {
                // Assicurati che l'ID del paziente sia nello stato della conversazione
                const patientId = patientIdManager.get();
                if (patientId && appState.conversationState) {
                    appState.conversationState.patientId = patientId;
                }
                
                const nextQuestionResponse = await conversationAPI.getNextQuestion(
                    appState.conversationState
                );
                
                console.log('Prossima domanda:', nextQuestionResponse);

                // Aggiorna lo stato della conversazione
                appState.conversationState = nextQuestionResponse.conversationState;
                
                // Assicurati che l'ID del paziente sia mantenuto
                if (patientId) {
                    appState.conversationState.patientId = patientId;
                }

                // Semplifica la domanda per rimuovere frasi rassicuranti
                const questionText = simplifyQuestion(nextQuestionResponse.message);
                
                // Mostra il messaggio della domanda dopo una breve pausa
                setTimeout(() => {
                    addChatMessage('assistant', questionText);
                    
                    // Renderizza le nuove opzioni di risposta
                    renderResponseOptions([
                        { text: 'Mai (0)', questionId: nextQuestionResponse.questionId, score: 0 },
                        { text: 'Alcuni giorni (1)', questionId: nextQuestionResponse.questionId, score: 1 },
                        { text: 'Più della metà dei giorni (2)', questionId: nextQuestionResponse.questionId, score: 2 },
                        { text: 'Quasi ogni giorno (3)', questionId: nextQuestionResponse.questionId, score: 3 }
                    ]);
                }, 500);
            } catch (error) {
                console.error('Errore nel richiedere la prossima domanda:', error);
                
                // Incrementa l'indice della domanda nello stato
                if (appState.conversationState.currentScale === 'GAD-7') {
                    appState.conversationState.currentQuestionIndex++;
                    
                    // Se abbiamo completato tutte le domande GAD-7, passa a PHQ-9
                    if (appState.conversationState.currentQuestionIndex >= 7) {
                        appState.conversationState.currentScale = 'PHQ-9';
                        appState.conversationState.currentQuestionIndex = 0;
                    }
                } else {
                    appState.conversationState.currentQuestionIndex++;
                    
                    // Se abbiamo completato tutte le domande PHQ-9, mostra i risultati
                    if (appState.conversationState.currentQuestionIndex >= 9) {
                        // Calcola i punteggi totali
                        const gadTotal = appState.conversationState.scores['GAD-7'].reduce((a, b) => a + (b || 0), 0);
                        const phqTotal = appState.conversationState.scores['PHQ-9'].reduce((a, b) => a + (b || 0), 0);
                        
                        // Crea risultati
                        appState.currentAssessment = {
                            gadScore: gadTotal,
                            phqScore: phqTotal,
                            date: new Date().toISOString(),
                            gadResponses: appState.conversationState.scores['GAD-7'],
                            phqResponses: appState.conversationState.scores['PHQ-9']
                        };
                        
                        // Salva i risultati usando il gestore ID paziente
                        const patientId = await patientIdManager.ensureValid();
                        await saveAssessment(patientId);
                        
                        return;
                    }
                }
                
                // Usa una domanda di fallback
                const fallbackQuestion = getNextFallbackQuestion(appState.conversationState);
                
                setTimeout(() => {
                    addChatMessage('assistant', fallbackQuestion.questionText);
                    
                    // Renderizza le opzioni di risposta
                    renderResponseOptions([
                        { text: 'Mai (0)', questionId: fallbackQuestion.questionId, score: 0 },
                        { text: 'Alcuni giorni (1)', questionId: fallbackQuestion.questionId, score: 1 },
                        { text: 'Più della metà dei giorni (2)', questionId: fallbackQuestion.questionId, score: 2 },
                        { text: 'Quasi ogni giorno (3)', questionId: fallbackQuestion.questionId, score: 3 }
                    ]);
                }, 500);
            }
        } catch (error) {
            console.error('Errore nel processare la risposta:', error);
            
            // Salva il punteggio nello stato
            if (appState.conversationState.currentScale === 'GAD-7') {
                appState.conversationState.scores['GAD-7'][appState.conversationState.currentQuestionIndex] = selectedOption.score;
            } else {
                appState.conversationState.scores['PHQ-9'][appState.conversationState.currentQuestionIndex] = selectedOption.score;
            }
            
            // Risposta standard anche in caso di errore
            addChatMessage('assistant', 'Grazie per la tua risposta, passiamo ora alla domanda successiva.');
            
            // Incrementa l'indice della domanda nello stato
            if (appState.conversationState.currentScale === 'GAD-7') {
                appState.conversationState.currentQuestionIndex++;
                
                // Se abbiamo completato tutte le domande GAD-7, passa a PHQ-9
                if (appState.conversationState.currentQuestionIndex >= 7) {
                    appState.conversationState.currentScale = 'PHQ-9';
                    appState.conversationState.currentQuestionIndex = 0;
                }
            } else {
                appState.conversationState.currentQuestionIndex++;
                
                // Se abbiamo completato tutte le domande PHQ-9, mostra i risultati
                if (appState.conversationState.currentQuestionIndex >= 9) {
                    // Calcola i punteggi totali
                    const gadTotal = appState.conversationState.scores['GAD-7'].reduce((a, b) => a + (b || 0), 0);
                    const phqTotal = appState.conversationState.scores['PHQ-9'].reduce((a, b) => a + (b || 0), 0);
                    
                    // Crea risultati
                    appState.currentAssessment = {
                        gadScore: gadTotal,
                        phqScore: phqTotal,
                        date: new Date().toISOString(),
                        gadResponses: appState.conversationState.scores['GAD-7'],
                        phqResponses: appState.conversationState.scores['PHQ-9']
                    };
                    
                    // Salva i risultati usando il gestore ID paziente
                    const patientId = await patientIdManager.ensureValid();
                    await saveAssessment(patientId);
                    
                    return;
                }
            }
            
            // Usa una domanda di fallback
            const fallbackQuestion = getNextFallbackQuestion(appState.conversationState);
            
            setTimeout(() => {
                addChatMessage('assistant', fallbackQuestion.questionText);
                
                // Renderizza le opzioni di risposta
                renderResponseOptions([
                    { text: 'Mai (0)', questionId: fallbackQuestion.questionId, score: 0 },
                    { text: 'Alcuni giorni (1)', questionId: fallbackQuestion.questionId, score: 1 },
                    { text: 'Più della metà dei giorni (2)', questionId: fallbackQuestion.questionId, score: 2 },
                    { text: 'Quasi ogni giorno (3)', questionId: fallbackQuestion.questionId, score: 3 }
                ]);
            }, 500);
        }
    } catch (error) {
        console.error('Errore generale nella gestione della risposta:', error);
        
        // Fallback di emergenza
        addChatMessage('assistant', 'Grazie per la tua risposta, passiamo ora alla domanda successiva.');
        
        // Incrementa l'indice della domanda nello stato
        if (appState.conversationState.currentScale === 'GAD-7') {
            appState.conversationState.currentQuestionIndex++;
            
            // Se abbiamo completato tutte le domande GAD-7, passa a PHQ-9
            if (appState.conversationState.currentQuestionIndex >= 7) {
                appState.conversationState.currentScale = 'PHQ-9';
                appState.conversationState.currentQuestionIndex = 0;
            }
        } else {
            appState.conversationState.currentQuestionIndex++;
            
            // Se abbiamo completato tutte le domande PHQ-9, mostra i risultati
            if (appState.conversationState.currentQuestionIndex >= 9) {
                // Calcola i punteggi totali
                const gadTotal = appState.conversationState.scores['GAD-7'].reduce((a, b) => a + (b || 0), 0);
                const phqTotal = appState.conversationState.scores['PHQ-9'].reduce((a, b) => a + (b || 0), 0);
                
                // Crea risultati
                appState.currentAssessment = {
                    gadScore: gadTotal,
                    phqScore: phqTotal,
                    date: new Date().toISOString(),
                    gadResponses: appState.conversationState.scores['GAD-7'],
                    phqResponses: appState.conversationState.scores['PHQ-9']
                };
                
                // Salva i risultati
                try {
                    const patientId = await patientIdManager.ensureValid();
                    await saveAssessment(patientId);
                } catch (saveError) {
                    console.error('Errore nel salvataggio dei risultati:', saveError);
                    setTimeout(() => {
                        screenManager.show('transitionToDoctorScreen');
                    }, 1500);
                }
                
                return;
            }
        }
        
        // Usa una domanda di fallback
        const fallbackQuestion = getNextFallbackQuestion(appState.conversationState);
        
        setTimeout(() => {
            addChatMessage('assistant', fallbackQuestion.questionText);
            
            // Renderizza le opzioni di risposta
            renderResponseOptions([
                { text: 'Mai (0)', questionId: fallbackQuestion.questionId, score: 0 },
                { text: 'Alcuni giorni (1)', questionId: fallbackQuestion.questionId, score: 1 },
                { text: 'Più della metà dei giorni (2)', questionId: fallbackQuestion.questionId, score: 2 },
                { text: 'Quasi ogni giorno (3)', questionId: fallbackQuestion.questionId, score: 3 }
            ]);
        }, 500);
    }
}

// Funzione migliorata per salvare la valutazione
async function saveAssessment(patientId) {
    try {
        console.log('[SaveAssessment] Inizio processo di salvataggio valutazione');
        
        // Verifica che abbiamo un ID paziente valido
        if (!patientId) {
            console.warn('[SaveAssessment] ID paziente non fornito, tentativo di recupero...');
            patientId = await patientIdManager.ensureValid();
        }
        
        console.log('[SaveAssessment] Utilizzo ID paziente:', patientId);
        
        // Verifica che abbiamo dati di valutazione
        if (!appState.currentAssessment) {
            console.error('[SaveAssessment] Dati di valutazione mancanti in appState.currentAssessment');
            
            // Crea dati di valutazione se mancanti
            const gadResponses = appState.conversationState?.scores?.['GAD-7'] || Array(7).fill(0);
            const phqResponses = appState.conversationState?.scores?.['PHQ-9'] || Array(9).fill(0);
            
            const gadTotal = gadResponses.reduce((a, b) => a + (b || 0), 0);
            const phqTotal = phqResponses.reduce((a, b) => a + (b || 0), 0);
            
            appState.currentAssessment = {
                gadScore: gadTotal,
                phqScore: phqTotal,
                gadResponses: gadResponses,
                phqResponses: phqResponses,
                date: new Date().toISOString()
            };
            
            console.log('[SaveAssessment] Creati dati di valutazione:', appState.currentAssessment);
        }
        
        // Crea l'oggetto di valutazione completo
        const assessmentData = {
            patientId: patientId,
            gadScore: appState.currentAssessment.gadScore,
            phqScore: appState.currentAssessment.phqScore,
            gadResponses: appState.currentAssessment.gadResponses,
            phqResponses: appState.currentAssessment.phqResponses,
            date: appState.currentAssessment.date || new Date().toISOString()
        };
        
        console.log('[SaveAssessment] Dati valutazione preparati:', assessmentData);
        
        // Verifica che tutti i campi obbligatori siano presenti
        const requiredFields = ['patientId', 'gadScore', 'phqScore', 'gadResponses', 'phqResponses'];
        const missingFields = requiredFields.filter(field => {
            if (field === 'gadResponses' || field === 'phqResponses') {
                return !assessmentData[field] || !Array.isArray(assessmentData[field]);
            }
            return !assessmentData[field] && assessmentData[field] !== 0;
        });
        
        if (missingFields.length > 0) {
            console.error(`[SaveAssessment] Campi obbligatori mancanti: ${missingFields.join(', ')}`);
            
            // Correggi i campi mancanti se possibile
            if (missingFields.includes('gadResponses') && !Array.isArray(assessmentData.gadResponses)) {
                assessmentData.gadResponses = Array(7).fill(1);
            }
            if (missingFields.includes('phqResponses') && !Array.isArray(assessmentData.phqResponses)) {
                assessmentData.phqResponses = Array(9).fill(1);
            }
        }
        
        // Assicurati che i campi di score siano numeri
        if (typeof assessmentData.gadScore !== 'number') {
            assessmentData.gadScore = parseInt(assessmentData.gadScore) || 0;
        }
        if (typeof assessmentData.phqScore !== 'number') {
            assessmentData.phqScore = parseInt(assessmentData.phqScore) || 0;
        }
        
        console.log('[SaveAssessment] Inizio salvataggio valutazione nel database...');
        
        try {
            // Salva nel database
            const result = await assessmentsAPI.create(assessmentData);
            console.log('[SaveAssessment] Valutazione salvata con successo:', result);
            
            // Salva l'ID della valutazione in localStorage per riferimento futuro
            if (result && result._id) {
                localStorage.setItem('lastAssessmentId', result._id);
            }
            
            // Visualizza i dati nella schermata risultati
            try {
                populateResultsScreen(assessmentData);
            } catch (displayError) {
                console.error('[SaveAssessment] Errore nella visualizzazione dei risultati:', displayError);
            }
            
            // Mostra la schermata di transizione
            setTimeout(() => {
                console.log('[SaveAssessment] Transizione a schermata finale');
                screenManager.show('transitionToDoctorScreen');
            }, 1500);
            
            return true;
        } catch (error) {
            console.error('[SaveAssessment] Errore nel salvataggio della valutazione:', error);
            
            // Mostra comunque i risultati anche in caso di errore
            try {
                populateResultsScreen(assessmentData);
            } catch (displayError) {
                console.error('[SaveAssessment] Errore nella visualizzazione dei risultati dopo errore di salvataggio:', displayError);
            }
            
            // Mostra comunque la schermata di transizione
            setTimeout(() => {
                console.log('[SaveAssessment] Transizione a schermata finale (dopo errore)');
                screenManager.show('transitionToDoctorScreen');
            }, 1500);
            
            return false;
        }
    } catch (saveError) {
        console.error('[SaveAssessment] Errore generale nel processo di salvataggio:', saveError);
        
        // Mostra comunque la schermata di transizione
        setTimeout(() => {
            console.log('[SaveAssessment] Transizione a schermata finale (dopo errore generale)');
            screenManager.show('transitionToDoctorScreen');
        }, 1500);
        
        return false;
    }
}

// Funzione per popolare la schermata dei risultati
function populateResultsScreen(assessmentData) {
    console.log('[PopulateResults] Popolamento schermata risultati con:', assessmentData);
    
    // Assicurati che gli elementi esistano prima di tentare di modificarli
    const gadScoreElement = document.getElementById('gadScoreValue');
    const phqScoreElement = document.getElementById('phqScoreValue');
    const gadInterpElement = document.getElementById('gadInterpretation');
    const phqInterpElement = document.getElementById('phqInterpretation');
    const patientNameElement = document.getElementById('resultPatientName');
    
    // Imposta i punteggi GAD e PHQ
    if (gadScoreElement) {
        gadScoreElement.textContent = assessmentData.gadScore;
    } else {
        console.error('[PopulateResults] Elemento gadScoreValue non trovato');
    }
    
    if (phqScoreElement) {
        phqScoreElement.textContent = assessmentData.phqScore;
    } else {
        console.error('[PopulateResults] Elemento phqScoreValue non trovato');
    }
    
    // Imposta le interpretazioni
    if (gadInterpElement) {
        const gadInterpretation = getGADInterpretation(assessmentData.gadScore);
        gadInterpElement.textContent = gadInterpretation;
        
        // Imposta classe colore in base alla severità
        gadInterpElement.className = '';
        if (assessmentData.gadScore >= 15) {
            gadInterpElement.classList.add('text-danger');
        } else if (assessmentData.gadScore >= 10) {
            gadInterpElement.classList.add('text-warning');
        } else if (assessmentData.gadScore >= 5) {
            gadInterpElement.classList.add('text-primary');
        } else {
            gadInterpElement.classList.add('text-success');
        }
    } else {
        console.error('[PopulateResults] Elemento gadInterpretation non trovato');
    }
    
    if (phqInterpElement) {
        const phqInterpretation = getPHQInterpretation(assessmentData.phqScore);
        phqInterpElement.textContent = phqInterpretation;
        
        // Imposta classe colore in base alla severità
        phqInterpElement.className = '';
        if (assessmentData.phqScore >= 20) {
            phqInterpElement.classList.add('text-danger');
        } else if (assessmentData.phqScore >= 15) {
            phqInterpElement.classList.add('text-warning');
        } else if (assessmentData.phqScore >= 5) {
            phqInterpElement.classList.add('text-primary');
        } else {
            phqInterpElement.classList.add('text-success');
        }
    } else {
        console.error('[PopulateResults] Elemento phqInterpretation non trovato');
    }
    
    // Imposta il nome del paziente
    if (patientNameElement) {
        let patientName = "Paziente";
        
        // Tenta di recuperare il nome del paziente
        if (appState && appState.currentPatient) {
            patientName = `${appState.currentPatient.firstName} ${appState.currentPatient.lastName}`;
        }
        
        patientNameElement.textContent = patientName;
    } else {
        console.error('[PopulateResults] Elemento resultPatientName non trovato');
    }
}

// Funzioni di interpretazione dei punteggi
function getGADInterpretation(score) {
    if (score >= 15) {
        return "Ansia severa";
    } else if (score >= 10) {
        return "Ansia moderata";
    } else if (score >= 5) {
        return "Ansia lieve";
    } else {
        return "Ansia minima";
    }
}

function getPHQInterpretation(score) {
    if (score >= 20) {
        return "Depressione severa";
    } else if (score >= 15) {
        return "Depressione moderatamente severa";
    } else if (score >= 10) {
        return "Depressione moderata";
    } else if (score >= 5) {
        return "Depressione lieve";
    } else {
        return "Depressione minima";
    }
}

// Funzione per semplificare il testo delle domande
function simplifyQuestion(question) {
    // Estrai solo la parte della domanda senza frasi rassicuranti
    const mainQuestion = question.match(/Nelle ultime[^?]+\?/);
    if (mainQuestion) {
        return mainQuestion[0] + " Scegli una delle opzioni sotto.";
    }
    
    // Se non riusciamo a ottenere la domanda in modo pulito, rimuovi le frasi rassicuranti
    const cleanedQuestion = question
        .replace(/Ricorda,.*sbagliata\./g, '')
        .replace(/Come sempre,.*sbagliata\./g, '')
        .replace(/Ricorda, non sei solo.*questo\./g, '')
        .replace(/Non c'è una risposta giusta o sbagliata\./g, '');
    
    return cleanedQuestion + " Scegli una delle opzioni sotto.";
}

// Funzione per ottenere una domanda di fallback basata sull'indice
function getNextFallbackQuestion(state) {
    // Definisci l'elenco completo delle domande GAD-7 e PHQ-9
    const allQuestions = [
        // GAD-7
        { questionId: 'gad1', questionText: "Nelle ultime 2 settimane, quanto spesso ti sei sentito nervoso, ansioso o teso? Scegli una delle opzioni sotto." },
        { questionId: 'gad2', questionText: "Nelle ultime 2 settimane, quanto spesso non sei riuscito a smettere di preoccuparti o a tenere sotto controllo le preoccupazioni? Scegli una delle opzioni sotto." },
        { questionId: 'gad3', questionText: "Nelle ultime 2 settimane, quanto spesso ti sei preoccupato troppo per varie cose? Scegli una delle opzioni sotto." },
        { questionId: 'gad4', questionText: "Nelle ultime 2 settimane, quanto spesso hai avuto difficoltà a rilassarti? Scegli una delle opzioni sotto." },
        { questionId: 'gad5', questionText: "Nelle ultime 2 settimane, quanto spesso sei stato talmente irrequieto da far fatica a stare seduto fermo? Scegli una delle opzioni sotto." },
        { questionId: 'gad6', questionText: "Nelle ultime 2 settimane, quanto spesso ti sei infastidito o irritato facilmente? Scegli una delle opzioni sotto." },
        { questionId: 'gad7', questionText: "Nelle ultime 2 settimane, quanto spesso hai avuto paura che potesse succedere qualcosa di terribile? Scegli una delle opzioni sotto." },
        
        // PHQ-9
        { questionId: 'phq1', questionText: "Nelle ultime 2 settimane, quanto spesso hai avuto scarso interesse o piacere nel fare le cose? Scegli una delle opzioni sotto." },
        { questionId: 'phq2', questionText: "Nelle ultime 2 settimane, quanto spesso ti sei sentito giù, depresso o disperato? Scegli una delle opzioni sotto." },
        { questionId: 'phq3', questionText: "Nelle ultime 2 settimane, quanto spesso hai avuto difficoltà ad addormentarti o a mantenere il sonno, o hai dormito troppo? Scegli una delle opzioni sotto." },
        { questionId: 'phq4', questionText: "Nelle ultime 2 settimane, quanto spesso ti sei sentito stanco o con poca energia? Scegli una delle opzioni sotto." },
        { questionId: 'phq5', questionText: "Nelle ultime 2 settimane, quanto spesso hai avuto scarso appetito o mangiato troppo? Scegli una delle opzioni sotto." },
        { questionId: 'phq6', questionText: "Nelle ultime 2 settimane, quanto spesso ti sei sentito in colpa o di essere un fallito o di aver danneggiato te stesso o la tua famiglia? Scegli una delle opzioni sotto." },
        { questionId: 'phq7', questionText: "Nelle ultime 2 settimane, quanto spesso hai avuto difficoltà a concentrarti sulle cose, come leggere il giornale o guardare la televisione? Scegli una delle opzioni sotto." },
        { questionId: 'phq8', questionText: "Nelle ultime 2 settimane, quanto spesso ti sei mosso o hai parlato così lentamente che altre persone hanno potuto notarlo, o al contrario sei stato così irrequieto da muoverti molto più del solito? Scegli una delle opzioni sotto." },
        { questionId: 'phq9', questionText: "Nelle ultime 2 settimane, quanto spesso hai pensato che sarebbe meglio essere morto o hai pensato di farti del male in qualche modo? Scegli una delle opzioni sotto." }
    ];
    
    let currentIndex = 0;
    
    // Determina l'indice in base allo stato
    if (state.currentScale === 'GAD-7') {
        currentIndex = state.currentQuestionIndex;
    } else {
        currentIndex = 7 + state.currentQuestionIndex; // PHQ-9 domande iniziano dall'indice 7
    }
    
    // Assicurati di non superare il limite dell'array
    if (currentIndex >= allQuestions.length) {
        // Ritorna l'ultima domanda se abbiamo superato tutte le domande
        return allQuestions[allQuestions.length - 1];
    }
    
    return allQuestions[currentIndex];
}

// Esporta la funzione globalmente
window.initializeConversation = initializeConversation;