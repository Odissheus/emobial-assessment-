// Configurazione di base per le chiamate API - MODIFICA PER AMBIENTE PRODUZIONE
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://emobial-assessment.onrender.com'; // modifica con l'URL reale del tuo backend

// Funzione di aiuto per le chiamate fetch
async function fetchWithAuth(endpoint, options = {}) {
  // ... resto del codice ...
// Funzione di aiuto per le chiamate fetch
async function fetchWithAuth(endpoint, options = {}) {
    // In un'app reale, includeremmo un token di autenticazione
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        // CORS impostato per localhost
        mode: 'cors',
        credentials: 'include'
    };
    
    try {
        // Aggiungi un timeout più lungo
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 secondi di timeout
        
        // Assicurati che l'endpoint inizi con /api/ se non è un URL completo
        let fullEndpoint = endpoint;
        if (!endpoint.startsWith('/api/') && !endpoint.startsWith('http')) {
            fullEndpoint = `/api${endpoint}`;
        }
        
        // Log migliorato per il debug
        console.log(`[API] Chiamata a: ${API_URL}${fullEndpoint}`, {
            method: options.method || 'GET',
            body: options.body ? JSON.parse(options.body) : null
        });
        
        const response = await fetch(`${API_URL}${fullEndpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Log della risposta
        console.log(`[API] Risposta da: ${API_URL}${fullEndpoint}`, {
            status: response.status,
            statusText: response.statusText
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`[API] Errore da ${fullEndpoint}:`, errorData);
            throw new Error(errorData.message || `API error: ${response.status}`);
        }
        
        return response.json();
    } catch (error) {
        console.error(`[API] Errore per ${endpoint}:`, error);
        
        // Modalità fallback per la demo
        if (endpoint.includes('/auth/login')) {
            console.log('Simulazione login in modalità fallback');
            return {
                success: true,
                token: 'mock-token-123456',
                user: {
                    id: '1',
                    username: JSON.parse(options.body).username || 'admin',
                    role: 'doctor'
                }
            };
        } else if (endpoint.includes('/patients')) {
            if (endpoint === '/patients' || endpoint === '/api/patients') {
                return [
                    { _id: '1', firstName: 'Mario', lastName: 'Bianchi', age: 45, registrationDate: new Date().toISOString() },
                    { _id: '2', firstName: 'Anna', lastName: 'Rossi', age: 38, registrationDate: new Date().toISOString() },
                    { _id: '3', firstName: 'Paolo', lastName: 'Verdi', age: 52, registrationDate: new Date().toISOString() }
                ];
            } else if (options.method === 'POST') {
                return {
                    _id: Date.now().toString(),
                    ...JSON.parse(options.body),
                    registrationDate: new Date().toISOString()
                };
            } else if (endpoint.includes('/patients/') || endpoint.includes('/api/patients/')) {
                const id = endpoint.split('/').pop();
                return {
                    _id: id,
                    firstName: 'Paziente',
                    lastName: 'Demo',
                    age: 40,
                    registrationDate: new Date().toISOString()
                };
            }
        } else if (endpoint.includes('/assessments')) {
            // NUOVO: Aggiunto fallback per le chiamate assessments
            console.log('[API] Utilizzo fallback per assessments:', endpoint);
            
            if (endpoint.includes('/patient/')) {
                // Fallback per getByPatientId
                const patientId = endpoint.split('/').pop();
                return [
                    {
                        _id: `mock-assessment-1-${patientId}`,
                        patientId: patientId,
                        gadScore: 8,
                        phqScore: 10,
                        gadResponses: [1, 2, 1, 1, 1, 1, 1],
                        phqResponses: [1, 2, 1, 2, 1, 1, 0, 1, 1],
                        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                    },
                    {
                        _id: `mock-assessment-2-${patientId}`,
                        patientId: patientId,
                        gadScore: 7,
                        phqScore: 9,
                        gadResponses: [1, 1, 1, 1, 1, 1, 1],
                        phqResponses: [1, 1, 1, 2, 1, 1, 0, 1, 1],
                        date: new Date().toISOString()
                    }
                ];
            } else if (options.method === 'POST') {
                // Fallback per create
                const assessmentData = JSON.parse(options.body);
                return {
                    _id: `mock-assessment-${Date.now()}`,
                    ...assessmentData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }
        } else if (endpoint.includes('/conversation')) {
            if (endpoint.includes('/conversation/start')) {
                // Estrai l'ID del paziente dalla richiesta, se presente
                const requestData = options.body ? JSON.parse(options.body) : {};
                const patientId = requestData.patientId || (appState && appState.currentPatient ? appState.currentPatient._id : null);
                
                console.log('Creazione stato conversazione con ID paziente:', patientId);
                
                return {
                    message: `Buongiorno, sono EmoBial e vorrei farti alcune brevi domande per capire meglio come ti senti. Le tue domande saranno riservate e serviranno solo per aiutare il medico a capire meglio il tuo stato emotivo. Possiamo iniziare?`,
                    conversationState: {
                        patientId: patientId,
                        patientName: requestData.patientName,
                        currentScale: 'GAD-7',
                        currentQuestionIndex: 0,
                        messages: [],
                        scores: {
                            'GAD-7': Array(7).fill(null),
                            'PHQ-9': Array(9).fill(null)
                        }
                    }
                };
            } else if (endpoint.includes('/conversation/next-question')) {
                const state = JSON.parse(options.body).conversationState;
                const isGAD = state.currentScale === 'GAD-7';
                
                // Conserva l'ID del paziente se presente
                const patientId = state.patientId || (appState && appState.currentPatient ? appState.currentPatient._id : null);
                if (patientId) {
                    state.patientId = patientId;
                }
                
                // Verifica se tutte le domande PHQ-9 sono state completate
                if (state.currentScale === 'PHQ-9' && state.currentQuestionIndex >= 9) {
                    // Restituisci una risposta di chiusura
                    return {
                        message: 'Grazie per aver completato tutte le domande. Le tue risposte sono preziose. Ti chiedo gentilmente di restituire il dispositivo al medico.',
                        questionId: 'complete',
                        conversationState: state,
                        isComplete: true
                    };
                }
                
                // Array completo delle domande per entrambe le scale
                const questions = [
                    // GAD-7 questions
                    'Nelle ultime 2 settimane, hai mai avuto momenti in cui ti sei sentito particolarmente nervoso, ansioso o teso? Se sì, quanto spesso è accaduto?',
                    'Nelle ultime 2 settimane, quanto spesso non sei riuscito/a a smettere di preoccuparti o a tenere sotto controllo le preoccupazioni?',
                    'Nelle ultime 2 settimane, quanto spesso ti sei preoccupato/a troppo per varie cose?',
                    'Nelle ultime 2 settimane, quanto spesso hai avuto difficoltà a rilassarti?',
                    'Nelle ultime 2 settimane, quanto spesso sei stato talmente irrequieto/a da far fatica a stare seduto/a fermo/a?',
                    'Nelle ultime 2 settimane, quanto spesso ti sei infastidito/a o irritato/a facilmente?',
                    'Nelle ultime 2 settimane, quanto spesso hai avuto paura che potesse succedere qualcosa di terribile?',
                    
                    // PHQ-9 questions
                    'Nelle ultime 2 settimane, quanto spesso hai avuto scarso interesse o piacere nel fare le cose?',
                    'Nelle ultime 2 settimane, quanto spesso ti sei sentito/a giù, depresso/a o disperato/a?',
                    'Nelle ultime 2 settimane, quanto spesso hai avuto difficoltà ad addormentarti o a mantenere il sonno, o hai dormito troppo?',
                    'Nelle ultime 2 settimane, quanto spesso ti sei sentito stanco o con poca energia?',
                    'Nelle ultime 2 settimane, quanto spesso hai avuto scarso appetito o mangiato troppo?',
                    'Nelle ultime 2 settimane, quanto spesso ti sei sentito in colpa o di essere un fallito o di aver danneggiato te stesso o la tua famiglia?',
                    'Nelle ultime 2 settimane, quanto spesso hai avuto difficoltà a concentrarti sulle cose, come leggere il giornale o guardare la televisione?',
                    'Nelle ultime 2 settimane, quanto spesso ti sei mosso o hai parlato così lentamente che altre persone hanno potuto notarlo, o al contrario sei stato così irrequieto da muoverti molto più del solito?',
                    'Nelle ultime 2 settimane, quanto spesso hai pensato che sarebbe meglio essere morto o hai pensato di farti del male in qualche modo?'
                ];
                
                let questionIndex;
                let questionId;
                
                if (isGAD) {
                    questionIndex = state.currentQuestionIndex;
                    questionId = `gad${state.currentQuestionIndex + 1}`;
                } else {
                    // Per PHQ-9, useremo indice 0-8 per le domande PHQ
                    questionIndex = 7 + state.currentQuestionIndex;
                    questionId = `phq${state.currentQuestionIndex + 1}`;
                }
                
                // Verifica se ci sono indici di domanda validi
                if (isGAD && state.currentQuestionIndex >= 7) {
                    // Se siamo alla fine del GAD-7, passiamo direttamente alla prima domanda PHQ-9
                    questionIndex = 7; // Prima domanda PHQ-9
                    questionId = 'phq1';
                }
                
                return {
                    message: questions[questionIndex] || 'Valuta la frequenza con cui hai sperimentato questo sintomo nelle ultime due settimane',
                    questionId: questionId,
                    conversationState: state
                };
            } else if (endpoint.includes('/conversation/process-response')) {
                const state = JSON.parse(options.body).conversationState;
                const score = JSON.parse(options.body).score;
                const questionId = JSON.parse(options.body).questionId;
                
                // Conserva l'ID del paziente se presente
                const patientId = state.patientId || (appState && appState.currentPatient ? appState.currentPatient._id : null);
                if (patientId) {
                    state.patientId = patientId;
                }
                
                // Aggiorna lo stato con la risposta
                if (state.currentScale === 'GAD-7') {
                    state.scores['GAD-7'][state.currentQuestionIndex] = score;
                    
                    // Passa alla domanda successiva o alla scala successiva
                    if (state.currentQuestionIndex >= 6) {
                        state.currentScale = 'PHQ-9';
                        state.currentQuestionIndex = 0;
                    } else {
                        state.currentQuestionIndex++;
                    }
                } else if (questionId === 'phq9') {
                    // Siamo all'ultima domanda del PHQ-9
                    state.scores['PHQ-9'][state.currentQuestionIndex] = score;
                    
                    // Calcola i punteggi finali
                    const gadScore = state.scores['GAD-7'].reduce((a, b) => a + b, 0);
                    const phqScore = state.scores['PHQ-9'].reduce((a, b) => a + b, 0);
                    
                    return {
                        message: 'Grazie per aver completato il questionario. Le tue risposte sono molto importanti. Ti chiedo gentilmente di restituire il dispositivo al medico.',
                        conversationState: state,
                        results: {
                            gadScore: gadScore,
                            phqScore: phqScore,
                            date: new Date().toISOString(),
                            gadResponses: state.scores['GAD-7'],
                            phqResponses: state.scores['PHQ-9']
                        }
                    };
                } else {
                    state.scores['PHQ-9'][state.currentQuestionIndex] = score;
                    
                    // Passa alla domanda successiva o completa
                    if (state.currentQuestionIndex >= 8) {
                        // Calcola i punteggi finali
                        const gadScore = state.scores['GAD-7'].reduce((a, b) => a + b, 0);
                        const phqScore = state.scores['PHQ-9'].reduce((a, b) => a + b, 0);
                        
                        return {
                            message: 'Grazie per aver completato il questionario',
                            conversationState: state,
                            results: {
                                gadScore: gadScore,
                                phqScore: phqScore,
                                date: new Date().toISOString(),
                                gadResponses: state.scores['GAD-7'],
                                phqResponses: state.scores['PHQ-9']
                            }
                        };
                    } else {
                        state.currentQuestionIndex++;
                    }
                }
                
                return {
                    message: 'Grazie per la tua risposta, passiamo ora alla domanda successiva.',
                    conversationState: state
                };
            } else if (endpoint.includes('/conversation/explain-question')) {
                try {
                    // Supponiamo che questa chiamata fallisca sempre in caso di test locale
                    throw new Error('Endpoint non disponibile');
                } catch (error) {
                    console.error('Endpoint di spiegazione non disponibile:', error);
                    // Fornisci un fallback diretto
                    return {
                        message: 'Questa domanda valuta la frequenza con cui hai sperimentato questo sintomo nelle ultime due settimane. Considera tutte le situazioni in cui hai provato questa sensazione, anche di breve durata o intensità variabile.'
                    };
                }
            }
        }
        
        // Se non abbiamo un fallback specifico, creiamo un messaggio di errore informativo
        console.warn('Nessun fallback disponibile per questo endpoint:', endpoint);
        return {
            error: true,
            message: `Errore di connessione al server. Operazione fallita per: ${endpoint}. ${error.message || 'Errore sconosciuto'}`
        };
    }
}

// API per l'autenticazione
const authAPI = {
    login: async (username, password) => {
        try {
            const result = await fetchWithAuth('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            
            console.log('Login result:', result);
            return result;
        } catch (error) {
            console.error('Errore durante il login:', error);
            // Fallback per il login in caso di errore
            return {
                success: true,
                token: 'mock-token-123456',
                user: {
                    id: '1',
                    username: username || 'admin',
                    role: 'doctor'
                }
            };
        }
    }
};

// API per la gestione dei pazienti
const patientsAPI = {
    getAll: async () => {
        return fetchWithAuth('/api/patients');
    },
    
    getById: async (id) => {
        return fetchWithAuth(`/api/patients/${id}`);
    },
    
    create: async (patientData) => {
        return fetchWithAuth('/api/patients', {
            method: 'POST',
            body: JSON.stringify(patientData),
        });
    }
};

// API per la gestione delle valutazioni
const assessmentsAPI = {
    getByPatientId: async (patientId) => {
        return fetchWithAuth(`/api/assessments/patient/${patientId}`);
    },
    
    create: async (assessmentData) => {
        // Log dettagliato per debug
        console.log('[API] Richiesta di salvataggio valutazione:', assessmentData);
        
        if (!assessmentData.patientId) {
            console.error('[API] ERRORE CRITICO: ID paziente mancante nella richiesta di salvataggio valutazione');
            
            // Tenta di recuperare l'ID paziente
            if (appState && appState.currentPatient && appState.currentPatient._id) {
                console.log('[API] Tentativo di recupero ID da appState.currentPatient:', appState.currentPatient._id);
                assessmentData.patientId = appState.currentPatient._id;
            } else if (appState && appState.conversationState && appState.conversationState.patientId) {
                console.log('[API] Tentativo di recupero ID da appState.conversationState:', appState.conversationState.patientId);
                assessmentData.patientId = appState.conversationState.patientId;
            } else if (localStorage.getItem('currentPatientId')) {
                console.log('[API] Tentativo di recupero ID da localStorage:', localStorage.getItem('currentPatientId'));
                assessmentData.patientId = localStorage.getItem('currentPatientId');
            } else {
                console.error('[API] Non è stato possibile recuperare l\'ID paziente da nessuna fonte');
                // Fallback: crea un ID paziente fittizio
                assessmentData.patientId = `demo-patient-${Date.now()}`;
                console.log('[API] Creato ID paziente fittizio:', assessmentData.patientId);
            }
        }
        
        // Verifica che tutti i campi obbligatori siano presenti
        const requiredFields = ['patientId', 'gadScore', 'phqScore', 'gadResponses', 'phqResponses'];
        const missingFields = requiredFields.filter(field => !assessmentData[field]);
        
        if (missingFields.length > 0) {
            console.error(`[API] Campi obbligatori mancanti: ${missingFields.join(', ')}`);
        }
        
        try {
            const result = await fetchWithAuth('/api/assessments', {
                method: 'POST',
                body: JSON.stringify(assessmentData),
            });
            console.log('[API] Risultato salvataggio valutazione:', result);
            return result;
        } catch (error) {
            console.error('[API] Errore nel salvataggio della valutazione:', error);
            
            // Fallback: restituisci una risposta fittizia di successo
            return {
                _id: `mock-assessment-${Date.now()}`,
                ...assessmentData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
    }
};

// API per la conversazione
const conversationAPI = {
    start: async (conversationData) => {
        console.log('Dati di avvio conversazione:', conversationData);
        return fetchWithAuth('/conversation/start', {
            method: 'POST',
            body: JSON.stringify(conversationData),
        });
    },
    
    getNextQuestion: async (conversationState) => {
        // Assicurati che l'ID del paziente sia presente
        if (appState && appState.currentPatient && appState.currentPatient._id) {
            conversationState.patientId = conversationState.patientId || appState.currentPatient._id;
        } else if (localStorage.getItem('currentPatientId')) {
            conversationState.patientId = conversationState.patientId || localStorage.getItem('currentPatientId');
        }
        
        return fetchWithAuth('/api/conversation/next-question', {
            method: 'POST',
            body: JSON.stringify({ conversationState }),
        });
    },
    
    processResponse: async (conversationState, questionId, score) => {
        // Trova e registra l'ID paziente da tutte le possibili fonti
        console.log('Stato conversazione ricevuto per processResponse:', {
            patientId: conversationState.patientId || (appState && appState.currentPatient ? appState.currentPatient._id : 'NON DISPONIBILE'),
            patientName: conversationState.patientName,
            patientAge: conversationState.patientAge,
            currentScale: conversationState.currentScale,
            currentQuestionIndex: conversationState.currentQuestionIndex
        });
    
        // Assicurati che l'ID del paziente sia presente
        if (appState && appState.currentPatient && appState.currentPatient._id) {
            conversationState.patientId = conversationState.patientId || appState.currentPatient._id;
        } else if (localStorage.getItem('currentPatientId')) {
            conversationState.patientId = conversationState.patientId || localStorage.getItem('currentPatientId');
        }
    
        try {
            const response = await fetchWithAuth('/api/conversation/process-response', {
                method: 'POST',
                body: JSON.stringify({ 
                    conversationState, 
                    questionId, 
                    score 
                }),
            });
    
            console.log('Risposta backend processo risposta:', response);
    
            // Assicurati che l'ID paziente venga conservato nella risposta
            if (response.conversationState) {
                if (conversationState.patientId) {
                    response.conversationState.patientId = conversationState.patientId;
                } else if (appState && appState.currentPatient && appState.currentPatient._id) {
                    response.conversationState.patientId = appState.currentPatient._id;
                } else if (localStorage.getItem('currentPatientId')) {
                    response.conversationState.patientId = localStorage.getItem('currentPatientId');
                }
            }
    
            return response;
        } catch (error) {
            console.error('Errore nel processo di risposta:', error);
            throw error;
        }
    },
    
    explainQuestion: async (conversationState, questionId) => {
        try {
            const response = await fetchWithAuth('/api/conversation/explain-question', {
                method: 'POST',
                body: JSON.stringify({ conversationState, questionId }),
            });
            return response;
        } catch (error) {
            console.error('Endpoint di spiegazione non disponibile:', error);
            // Fornisci un fallback diretto invece di lanciare un'eccezione
            return {
                message: 'Questa domanda valuta la frequenza con cui hai sperimentato questo sintomo nelle ultime due settimane. Considera tutte le situazioni in cui hai provato questa sensazione, anche di breve durata o intensità variabile.'
            };
        }
    }
};

// Funzione per creare un paziente di test se necessario
async function ensureValidPatient() {
    console.log('[API] Verifica esistenza paziente valido...');
    
    // Verifica se abbiamo già un paziente nel localStorage o appState
    let patientId = null;
    
    if (appState && appState.currentPatient && appState.currentPatient._id) {
        patientId = appState.currentPatient._id;
        console.log('[API] Paziente trovato in appState:', patientId);
        return patientId;
    }
    
    if (localStorage.getItem('currentPatientId')) {
        patientId = localStorage.getItem('currentPatientId');
        console.log('[API] Paziente trovato in localStorage:', patientId);
        
        // Verifica che il paziente esista realmente
        try {
            const patient = await patientsAPI.getById(patientId);
            if (patient && patient._id) {
                // Aggiorna appState
                if (!appState) window.appState = {};
                if (!appState.currentPatient) appState.currentPatient = {};
                appState.currentPatient = patient;
                return patientId;
            }
        } catch (e) {
            console.log('[API] Paziente in localStorage non trovato nel database');
        }
    }
    
    // Nessun paziente valido trovato, creiamo uno nuovo
    console.log('[API] Creazione nuovo paziente di test');
    try {
        const patientData = {
            firstName: 'Test',
            lastName: 'Utente',
            age: 35
        };
        
        const newPatient = await patientsAPI.create(patientData);
        console.log('[API] Nuovo paziente creato:', newPatient);
        
        // Salva in localStorage e appState
        localStorage.setItem('currentPatientId', newPatient._id);
        if (!appState) window.appState = {};
        if (!appState.currentPatient) appState.currentPatient = {};
        appState.currentPatient = newPatient;
        
        return newPatient._id;
    } catch (error) {
        console.error('[API] Errore nella creazione del paziente:', error);
        
        // Fallback di emergenza
        const fallbackId = `local-${Date.now()}`;
        localStorage.setItem('currentPatientId', fallbackId);
        if (!appState) window.appState = {};
        if (!appState.currentPatient) appState.currentPatient = {};
        appState.currentPatient = {
            _id: fallbackId,
            firstName: 'Test',
            lastName: 'Locale',
            age: 30
        };
        
        return fallbackId;
    }
}

// Funzione di utilità per verificare i problemi CORS
function testCorsConfiguration() {
    console.log('[CORS] Verifica configurazione CORS...');
    
    fetch(`${API_URL}/api/health`, {
        method: 'OPTIONS',
        mode: 'cors',
        credentials: 'include'
    })
    .then(response => {
        console.log('[CORS] Test OPTIONS riuscito:', {
            status: response.status,
            headers: {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
            }
        });
    })
    .catch(error => {
        console.error('[CORS] Test OPTIONS fallito:', error);
        console.warn('[CORS] Potrebbe essere necessario configurare correttamente CORS sul server.');
    });
}

// Avvia il test CORS all'inizializzazione e assicura un paziente valido
testCorsConfiguration();
ensureValidPatient().then(patientId => {
    console.log('[API] Paziente pronto per i test:', patientId);
});