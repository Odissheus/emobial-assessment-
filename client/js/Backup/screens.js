// Gestione della navigazione tra le schermate
const screenManager = {
    screens: document.querySelectorAll('.screen'),
    
    // Mostra una schermata specifica
    show: function(screenId) {
        this.screens.forEach(screen => {
            screen.classList.remove('active');
        });
        const screenToShow = document.getElementById(screenId);
        if (screenToShow) {
            screenToShow.classList.add('active');
        } else {
            console.error(`Schermata con ID "${screenId}" non trovata`);
        }
    },
};

// Stato dell'applicazione
const appState = {
    currentUser: null,
    currentPatient: null,
    currentAssessment: null,
    conversationState: null,
    
    // Salva lo stato dell'applicazione nella sessione
    saveState: function() {
        sessionStorage.setItem('appState', JSON.stringify({
            currentUser: this.currentUser,
            currentPatient: this.currentPatient
        }));
    },
    
    // Carica lo stato dell'applicazione dalla sessione
    loadState: function() {
        const savedState = sessionStorage.getItem('appState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            this.currentUser = parsedState.currentUser;
            this.currentPatient = parsedState.currentPatient;
            
            // Se c'è un utente loggato, mostra i controlli della navbar
            if (this.currentUser) {
                const navControls = document.getElementById('navControls');
                if (navControls) {
                    navControls.classList.remove('d-none');
                }
            }
        }
    }
};

// Gestione del login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            
            if (!usernameInput || !passwordInput) {
                showErrorNotification('Errore nel form di login');
                return;
            }
            
            const username = usernameInput.value;
            const password = passwordInput.value;
            
            try {
                // Mostra indicatore di caricamento
                toggleLoading(true, 'loginScreen');
                
                // Effettua il login
                const response = await authAPI.login(username, password);
                
                // Salva l'utente corrente
                appState.currentUser = response.user;
                appState.saveState();
                
                // Mostra i controlli della navbar
                const navControls = document.getElementById('navControls');
                if (navControls) {
                    navControls.classList.remove('d-none');
                }
                
                // Nascondi l'indicatore di caricamento
                toggleLoading(false, 'loginScreen');
                
                // Passa alla dashboard invece che direttamente alla lista pazienti
                screenManager.show('dashboardScreen');
            } catch (error) {
                // Nascondi l'indicatore di caricamento
                toggleLoading(false, 'loginScreen');
                
                showErrorNotification('Errore di login: ' + (error.message || 'Credenziali non valide'));
            }
        });
    }
    
    // Inizializza lo stato dell'app e gli event listener
    appState.loadState();
    setupEventListeners();
});

// Carica la lista dei pazienti
async function loadPatients() {
    try {
        // Mostra indicatore di caricamento
        toggleLoading(true, 'patientListScreen');
        
        const patients = await patientsAPI.getAll();
        renderPatientList(patients);
        
        // Nascondi l'indicatore di caricamento
        toggleLoading(false, 'patientListScreen');
    } catch (error) {
        console.error('Errore nel caricamento dei pazienti:', error);
        
        // Nascondi l'indicatore di caricamento
        toggleLoading(false, 'patientListScreen');
        
        showErrorNotification('Errore nel caricamento dei pazienti');
        
        // Dati di esempio
        const samplePatients = [
            { _id: '1', firstName: 'Mario', lastName: 'Bianchi', age: 45, registrationDate: new Date().toISOString() },
            { _id: '2', firstName: 'Anna', lastName: 'Rossi', age: 38, registrationDate: new Date().toISOString() },
            { _id: '3', firstName: 'Paolo', lastName: 'Verdi', age: 52, registrationDate: new Date().toISOString() }
        ];
        renderPatientList(samplePatients);
    }
}

// Renderizza la lista dei pazienti
function renderPatientList(patients) {
    const patientListContainer = document.getElementById('patientListContainer');
    if (!patientListContainer) {
        console.error('Container per la lista pazienti non trovato');
        return;
    }
    
    patientListContainer.innerHTML = '';
    
    if (patients.length === 0) {
        patientListContainer.innerHTML = '<p class="text-center text-muted">Nessun paziente registrato</p>';
        return;
    }
    
    patients.forEach(patient => {
        const patientElement = document.createElement('div');
        patientElement.className = 'patient-item d-flex justify-content-between align-items-center';
        patientElement.innerHTML = `
            <div>
                <h6 class="mb-1">${patient.lastName} ${patient.firstName}</h6>
                <small class="text-muted">${patient.age} anni - Registrato: ${new Date(patient.registrationDate).toLocaleDateString('it-IT')}</small>
            </div>
            <div>
                <button class="btn btn-sm btn-primary view-patient-btn" data-patient-id="${patient._id}">
                    <i class="fas fa-eye me-1"></i>
                    Dettagli
                </button>
            </div>
        `;
        
        patientListContainer.appendChild(patientElement);
        
        // Aggiungi l'event listener al pulsante
        const viewButton = patientElement.querySelector('.view-patient-btn');
        if (viewButton) {
            viewButton.addEventListener('click', function() {
                const patientId = this.getAttribute('data-patient-id');
                loadPatientDetails(patientId);
            });
        }
    });
}

// Carica i dettagli di un paziente
async function loadPatientDetails(patientId) {
    try {
        // Mostra indicatore di caricamento
        toggleLoading(true, 'patientListScreen');
        
        // Ottieni i dati del paziente
        const patient = await patientsAPI.getById(patientId);
        appState.currentPatient = patient;
        appState.saveState();
        
        // Nascondi l'indicatore di caricamento
        toggleLoading(false, 'patientListScreen');
        
        // Aggiorna l'interfaccia con i dati del paziente
        updatePatientDetailsUI(patient);
        
        // Carica le valutazioni del paziente
        loadPatientAssessments(patientId);
        
        // Mostra la schermata del paziente
        screenManager.show('patientDetailScreen');
    } catch (error) {
        console.error('Errore nel caricamento dei dettagli del paziente:', error);
        
        // Nascondi l'indicatore di caricamento
        toggleLoading(false, 'patientListScreen');
        
        showErrorNotification('Errore nel caricamento dei dettagli del paziente');
        
        // Per il demo, usa dati di esempio
        const samplePatient = { 
            _id: patientId, 
            firstName: 'Mario', 
            lastName: 'Bianchi', 
            age: 45 
        };
        appState.currentPatient = samplePatient;
        appState.saveState();
        
        updatePatientDetailsUI(samplePatient);
        loadPatientAssessments(patientId, true);
        screenManager.show('patientDetailScreen');
    }
}

// Aggiorna l'interfaccia con i dettagli del paziente
function updatePatientDetailsUI(patient) {
    const patientDetailName = document.getElementById('patientDetailName');
    const detailFirstName = document.getElementById('detailFirstName');
    const detailLastName = document.getElementById('detailLastName');
    const detailAge = document.getElementById('detailAge');
    const detailId = document.getElementById('detailId');
    
    if (patientDetailName) patientDetailName.textContent = `${patient.lastName} ${patient.firstName}`;
    if (detailFirstName) detailFirstName.textContent = patient.firstName;
    if (detailLastName) detailLastName.textContent = patient.lastName;
    if (detailAge) detailAge.textContent = patient.age;
    if (detailId) detailId.textContent = patient._id;
}

// Carica le valutazioni di un paziente
async function loadPatientAssessments(patientId, useSampleData = false) {
    const assessmentHistoryTableBody = document.getElementById('assessmentHistoryTableBody');
    if (!assessmentHistoryTableBody) {
        console.error('Tabella della cronologia valutazioni non trovata');
        return;
    }
    
    assessmentHistoryTableBody.innerHTML = '';
    
    try {
        if (useSampleData) throw new Error('Using sample data');
        
        // Mostra indicatore di caricamento nella tabella
        assessmentHistoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Caricamento valutazioni...</td></tr>';
        
        const assessments = await assessmentsAPI.getByPatientId(patientId);
        
        if (assessments.length === 0) {
            assessmentHistoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nessuna valutazione trovata</td></tr>';
            return;
        }
        
        // Pulisci la tabella
        assessmentHistoryTableBody.innerHTML = '';
        
        assessments.forEach(assessment => {
            renderAssessmentRow(assessment, assessmentHistoryTableBody);
        });
    } catch (error) {
        console.error('Errore nel caricamento delle valutazioni:', error);
        
        // Dati di esempio
        assessmentHistoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nessuna valutazione trovata</td></tr>';
    }
}

// Renderizza una riga della tabella delle valutazioni
function renderAssessmentRow(assessment, tableBody) {
    const row = document.createElement('tr');
    
    const date = new Date(assessment.date).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const gadInterpretation = getGADInterpretation(assessment.gadScore);
    const phqInterpretation = getPHQInterpretation(assessment.phqScore);
    
    row.innerHTML = `
        <td>${date}</td>
        <td>${assessment.gadScore} - ${gadInterpretation}</td>
        <td>${assessment.phqScore} - ${phqInterpretation}</td>
        <td>
            <button class="btn btn-sm btn-outline-primary view-assessment-btn" data-assessment-id="${assessment._id}">
                <i class="fas fa-eye"></i>
            </button>
        </td>
    `;
    
    tableBody.appendChild(row);
    
    // Aggiungi event listener
    const viewButton = row.querySelector('.view-assessment-btn');
    if (viewButton) {
        viewButton.addEventListener('click', function() {
            viewAssessmentResults(assessment);
        });
    }
}

// Visualizza i risultati di una valutazione
function viewAssessmentResults(assessment) {
    // Aggiorna l'interfaccia con i dati della valutazione
    updateResultsUI(assessment);
    
    // Mostra la schermata dei risultati
    screenManager.show('resultsScreen');
}

// Aggiorna l'interfaccia con i risultati della valutazione
function updateResultsUI(assessment) {
    const resultPatientName = document.getElementById('resultPatientName');
    const assessmentDate = document.getElementById('assessmentDate');
    const gadScoreValue = document.getElementById('gadScoreValue');
    const phqScoreValue = document.getElementById('phqScoreValue');
    const gadInterpretation = document.getElementById('gadInterpretation');
    const phqInterpretation = document.getElementById('phqInterpretation');
    
    if (resultPatientName && appState.currentPatient) {
        resultPatientName.textContent = `${appState.currentPatient.lastName} ${appState.currentPatient.firstName}`;
    }
    
    if (assessmentDate) {
        assessmentDate.textContent = new Date(assessment.date).toLocaleDateString('it-IT');
    }
    
    if (gadScoreValue) gadScoreValue.textContent = assessment.gadScore;
    if (phqScoreValue) phqScoreValue.textContent = assessment.phqScore;
    
    if (gadInterpretation) gadInterpretation.textContent = getGADInterpretation(assessment.gadScore);
    if (phqInterpretation) phqInterpretation.textContent = getPHQInterpretation(assessment.phqScore);
}

// Inizia una nuova valutazione
function startNewAssessment() {
    // Assicurati che ci sia un paziente corrente
    if (!appState.currentPatient) {
        showErrorNotification('Seleziona prima un paziente');
        return;
    }
    
    // Mostra la schermata di transizione
    screenManager.show('transitionToPatientScreen');
}

// Funzioni di interpretazione punteggi
function getGADInterpretation(score) {
    if (score >= 0 && score <= 4) return 'Ansia minima';
    if (score >= 5 && score <= 9) return 'Ansia lieve';
    if (score >= 10 && score <= 14) return 'Ansia moderata';
    return 'Ansia severa';
}

function getPHQInterpretation(score) {
    if (score >= 0 && score <= 4) return 'Depressione minima o assente';
    if (score >= 5 && score <= 9) return 'Depressione lieve';
    if (score >= 10 && score <= 14) return 'Depressione moderata';
    if (score >= 15 && score <= 19) return 'Depressione moderata-severa';
    return 'Depressione severa';
}

// Funzione per mostrare notifiche di errore
function showErrorNotification(message) {
    // Crea un elemento per la notifica
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show m-3" role="alert">
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Aggiungi al documento
    document.body.appendChild(notification);
    
    // Rimuovi dopo 5 secondi
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Funzione per mostrare notifiche di successo
function showSuccessNotification(message) {
    // Crea un elemento per la notifica
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show m-3" role="alert">
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Aggiungi al documento
    document.body.appendChild(notification);
    
    // Rimuovi dopo 5 secondi
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Funzione per mostrare/nascondere l'indicatore di caricamento
function toggleLoading(show, elementId = 'body') {
    const target = elementId === 'body' ? document.body : document.getElementById(elementId);
    
    if (!target) {
        console.warn(`Elemento con ID ${elementId} non trovato`);
        return;
    }
    
    if (show) {
        // Crea e mostra l'indicatore di caricamento
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Caricamento...</span>
            </div>
            <p class="mt-2">Caricamento in corso...</p>
        `;
        
        target.appendChild(loader);
    } else {
        // Rimuovi tutti gli indicatori di caricamento
        const loaders = target.querySelectorAll('.loading-overlay');
        loaders.forEach(loader => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        });
    }
}

// Configurazione di tutti gli event listener
function setupEventListeners() {
    // Pulsanti di navigazione
    setupButtonListener('newPatientBtn', () => screenManager.show('newPatientScreen'));
    setupButtonListener('backToListBtn', () => screenManager.show('patientListScreen'));
    setupButtonListener('backToListFromDetailBtn', () => screenManager.show('patientListScreen'));
    setupButtonListener('backToPatientBtn', () => screenManager.show('patientDetailScreen'));
    setupButtonListener('startNewAssessmentBtn', startNewAssessment);
    setupButtonListener('startNewAssessmentFromResultsBtn', startNewAssessment);
    setupButtonListener('confirmTransitionBtn', () => {
        if (typeof initializeConversation === 'function') {
            initializeConversation();
        } else {
            console.error('La funzione initializeConversation non è definita');
        }
    });
    setupButtonListener('returnToMedicBtn', () => screenManager.show('resultsScreen'));
    setupButtonListener('logoutBtn', handleLogout);
    
    // Dashboard buttons
    setupButtonListener('accessDatabaseBtn', () => {
        loadPatients();
        screenManager.show('patientListScreen');
    });
    
    setupButtonListener('startEvaluationBtn', () => {
        loadPatients();
        screenManager.show('patientListScreen');
    });
    
    // Form nuovo paziente
    const newPatientForm = document.getElementById('newPatientForm');
    if (newPatientForm) {
        newPatientForm.addEventListener('submit', handleNewPatientSubmit);
    }
    
    // Ricerca pazienti
    const searchPatient = document.getElementById('searchPatient');
    if (searchPatient) {
        searchPatient.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                searchPatients(this.value);
            }
        });
    }
    
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchTerm = document.getElementById('searchPatient').value;
            searchPatients(searchTerm);
        });
    }
}

// Helper per configurare un event listener su un pulsante
function setupButtonListener(id, callback) {
    const button = document.getElementById(id);
    if (button) {
        button.addEventListener('click', callback);
    }
}

// Gestione del logout
function handleLogout() {
    // Azzera lo stato
    appState.currentUser = null;
    appState.currentPatient = null;
    appState.currentAssessment = null;
    appState.conversationState = null;
    appState.saveState();
    
    // Nascondi i controlli della navbar
    const navControls = document.getElementById('navControls');
    if (navControls) {
        navControls.classList.add('d-none');
    }
    
    // Torna alla pagina di login
    screenManager.show('loginScreen');
}

// Gestione del form per nuovo paziente
async function handleNewPatientSubmit(e) {
    e.preventDefault();
    
    const patientFirstName = document.getElementById('patientFirstName');
    const patientLastName = document.getElementById('patientLastName');
    const patientAge = document.getElementById('patientAge');
    
    if (!patientFirstName || !patientLastName || !patientAge) {
        showErrorNotification('Form incompleto');
        return;
    }
    
    const patientData = {
        firstName: patientFirstName.value,
        lastName: patientLastName.value,
        age: parseInt(patientAge.value)
    };
    
    try {
        // Mostra indicatore di caricamento
        toggleLoading(true, 'newPatientScreen');
        
        const newPatient = await patientsAPI.create(patientData);
        appState.currentPatient = newPatient;
        appState.saveState();
        
        // Nascondi l'indicatore di caricamento
        toggleLoading(false, 'newPatientScreen');
        
        showSuccessNotification('Paziente creato con successo');
        startNewAssessment();
    } catch (error) {
        console.error('Errore nella creazione del paziente:', error);
        
        // Nascondi l'indicatore di caricamento
        toggleLoading(false, 'newPatientScreen');
        
        showErrorNotification('Errore nella creazione del paziente');
        
        // Per il demo, simula la creazione
        const samplePatient = {
            _id: Date.now().toString(),
            ...patientData,
            registrationDate: new Date().toISOString()
        };
        appState.currentPatient = samplePatient;
        appState.saveState();
        
        showSuccessNotification('Paziente creato con successo (modalità demo)');
        startNewAssessment();
    }
}

// Funzione per cercare pazienti
function searchPatients(searchTerm) {
    if (!searchTerm) return;
    
    searchTerm = searchTerm.toLowerCase();
    
    // Ottieni tutti gli elementi paziente
    const patientItems = document.querySelectorAll('.patient-item');
    
    let foundAny = false;
    
    patientItems.forEach(item => {
        const nameElement = item.querySelector('h6');
        if (!nameElement) return;
        
        const patientName = nameElement.textContent.toLowerCase();
        
        if (patientName.includes(searchTerm)) {
            item.style.display = '';
            foundAny = true;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Mostra un messaggio se non sono stati trovati risultati
    const patientListContainer = document.getElementById('patientListContainer');
    if (!patientListContainer) return;
    
    const noResultsMsg = patientListContainer.querySelector('.no-results-message');
    
    if (!foundAny) {
        if (!noResultsMsg) {
            const message = document.createElement('p');
            message.className = 'text-center text-muted no-results-message';
            message.textContent = `Nessun paziente trovato per "${searchTerm}"`;
            patientListContainer.appendChild(message);
        }
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }
}