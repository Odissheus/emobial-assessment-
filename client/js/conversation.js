// Gestione della conversazione per la valutazione
console.log('Conversation module loaded');

// Inizializza la conversazione con l'assistente virtuale
async function initializeConversation() {
    try {
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
            const conversationResponse = await conversationAPI.start(
                `${appState.currentPatient.firstName} ${appState.currentPatient.lastName}`
            );

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
                }
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
                const nextQuestionResponse = await conversationAPI.getNextQuestion(
                    appState.conversationState
                );
                
                console.log('Prossima domanda:', nextQuestionResponse);

                // Aggiorna lo stato della conversazione
                appState.conversationState = nextQuestionResponse.conversationState;

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
            // Invia la risposta al backend
            const processResponse = await conversationAPI.processResponse(
                appState.conversationState, 
                selectedOption.questionId, 
                selectedOption.score
            );

            console.log('Risposta processata:', processResponse);

            // Aggiorna lo stato della conversazione
            appState.conversationState = processResponse.conversationState;

            // Aggiungi sempre la risposta standard
            addChatMessage('assistant', 'Grazie per la tua risposta, passiamo ora alla domanda successiva.');

            // Controlla se ci sono risultati finali
            if (processResponse.results) {
                console.log('Risultati finali:', processResponse.results);

                // Salva i risultati nell'app state
                appState.currentAssessment = processResponse.results;

                // Mostra la schermata di transizione dopo una pausa
                setTimeout(() => {
                    screenManager.show('transitionToDoctorScreen');
                }, 1500);
                
                return;
            }

            // Ottieni la prossima domanda
            try {
                const nextQuestionResponse = await conversationAPI.getNextQuestion(
                    appState.conversationState
                );
                
                console.log('Prossima domanda:', nextQuestionResponse);

                // Aggiorna lo stato della conversazione
                appState.conversationState = nextQuestionResponse.conversationState;

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
                        
                        // Mostra la schermata di transizione
                        setTimeout(() => {
                            screenManager.show('transitionToDoctorScreen');
                        }, 1500);
                        
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
                    
                    // Mostra la schermata di transizione
                    setTimeout(() => {
                        screenManager.show('transitionToDoctorScreen');
                    }, 1500);
                    
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
                
                // Mostra la schermata di transizione
                setTimeout(() => {
                    screenManager.show('transitionToDoctorScreen');
                }, 1500);
                
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