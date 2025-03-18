const { OpenAI } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Prompt di sistema base
const systemPrompt = `
Sei EmoBial, un assistente empatico e professionale per il supporto emotivo. 
Il tuo compito è guidare una conversazione delicata e riservata per comprendere 
il benessere emotivo della persona.

Principi guida:
- Mantieni un tono caldo, comprensivo e non giudicante
- Ascolta con empatia
- Usa un linguaggio semplice e rassicurante
- Mostra comprensione per le esperienze della persona
- Non fornire diagnosi o consigli medici specifici
- Rispetta la privacy e la riservatezza

Obiettivo: Creare uno spazio sicuro dove la persona possa 
condividere liberamente i propri stati emotivi.
`;

// Definizione delle domande
const GAD7_QUESTIONS = [
  { id: 'gad1', text: 'Sentirsi nervoso/a, ansioso/a o teso/a' },
  { id: 'gad2', text: 'Non riuscire a smettere di preoccuparsi o a tenere sotto controllo le preoccupazioni' },
  { id: 'gad3', text: 'Preoccuparsi troppo per varie cose' },
  { id: 'gad4', text: 'Avere difficoltà a rilassarsi' },
  { id: 'gad5', text: 'Essere talmente irrequieto/a da far fatica a stare seduto/a fermo/a' },
  { id: 'gad6', text: 'Infastidirsi o irritarsi facilmente' },
  { id: 'gad7', text: 'Avere paura che possa succedere qualcosa di terribile' }
];

const PHQ9_QUESTIONS = [
  { id: 'phq1', text: 'Scarso interesse o piacere nel fare le cose' },
  { id: 'phq2', text: 'Sentirsi giù, depresso o disperato' },
  { id: 'phq3', text: 'Difficoltà ad addormentarsi o mantenere il sonno, o dormire troppo' },
  { id: 'phq4', text: 'Sentirsi stanco o avere poca energia' },
  { id: 'phq5', text: 'Scarso appetito o mangiare troppo' },
  { id: 'phq6', text: 'Sentirsi in colpa o di essere un fallito o di aver danneggiato se stesso o la sua famiglia' },
  { id: 'phq7', text: 'Difficoltà a concentrarsi sulle cose, come leggere il giornale o guardare la televisione' },
  { id: 'phq8', text: 'Muoversi o parlare così lentamente tanto che anche gli altri se ne accorgevano o, al contrario, essere così irrequieto o agitato da doversi muovere molto più del solito' },
  { id: 'phq9', text: 'Pensare che sarebbe meglio essere morto o di farsi del male in qualche modo' }
];

/**
 * Inizia una nuova conversazione
 * @param {string} patientName - Nome del paziente
 */
async function startConversation(patientName) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `Ciao "${patientName}", sono Emobial e vorrei farti alcune brevi domande per capire meglio come ti senti. Le tue domande saranno riservate e serviranno solo per aiutare il medico a capire meglio il tuo stato emotivo. Possiamo iniziare?` }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 300
    });

    return {
      message: response.choices[0].message.content,
      conversationState: {
        currentScale: 'GAD-7',
        currentQuestionIndex: 0,
        messages: messages.concat([{ 
          role: 'assistant', 
          content: response.choices[0].message.content 
        }]),
        scores: {
          'GAD-7': Array(7).fill(null),
          'PHQ-9': Array(9).fill(null)
        },
        phqDifficultyScore: null
      }
    };
  } catch (error) {
    console.error('Error starting conversation:', error);
    throw error;
  }
}

/**
 * Genera la prossima domanda basata sullo stato corrente
 * @param {Object} state - Stato attuale della conversazione
 */
async function getNextQuestion(state) {
  try {
    // Determina quale domanda porre
    let currentQuestion;
    if (state.currentScale === 'GAD-7') {
      if (state.currentQuestionIndex >= GAD7_QUESTIONS.length) {
        // MODIFICA: Invece di chiamare handleTransition,
        // passiamo direttamente alla prima domanda PHQ-9
        const updatedState = {
          ...state,
          currentScale: 'PHQ-9',
          currentQuestionIndex: 0
        };
        
        return getNextQuestion(updatedState);
      }
      currentQuestion = GAD7_QUESTIONS[state.currentQuestionIndex];
    } else {
      if (state.currentQuestionIndex >= PHQ9_QUESTIONS.length) {
        // Domanda finale o conclusione
        if (state.phqDifficultyScore === null) {
          return await askDifficultyQuestion(state);
        } else {
          return await completeAssessment(state);
        }
      }
      currentQuestion = PHQ9_QUESTIONS[state.currentQuestionIndex];
    }

    // Prepara prompt per il LLM
    const systemInstruction = `Formula la seguente domanda in modo conversazionale: "${currentQuestion.text}". 
                              Chiedi al paziente con quale frequenza ha vissuto questo stato nelle ultime due settimane.`;

    const messages = [...state.messages, { role: 'system', content: systemInstruction }];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 300
    });

    const updatedMessages = [...state.messages, 
      { role: 'system', content: systemInstruction },
      { role: 'assistant', content: response.choices[0].message.content }
    ];

    return {
      message: response.choices[0].message.content,
      questionId: currentQuestion.id,
      conversationState: {
        ...state,
        messages: updatedMessages
      }
    };
  } catch (error) {
    console.error('Error getting next question:', error);
    throw error;
  }
}

/**
 * Processa la risposta del paziente
 * @param {Object} state - Stato attuale della conversazione
 * @param {number} score - Punteggio selezionato (0-3)
 */
async function processResponse(state, questionId, score) {
  try {
    // Aggiorna lo stato con la risposta
    const updatedState = {...state};
    const userMessage = { role: 'user', content: `${score}` };
    updatedState.messages.push(userMessage);

    // Salva il punteggio
    if (state.currentScale === 'GAD-7') {
      updatedState.scores['GAD-7'][state.currentQuestionIndex] = score;
    } else if (questionId === 'phqDifficulty') {
      updatedState.phqDifficultyScore = score;
    } else {
      updatedState.scores['PHQ-9'][state.currentQuestionIndex] = score;
    }

    // Genera una risposta di acknowledgment
    const acknowledgmentPrompt = `Il paziente ha risposto ${score} alla domanda. 
                                 Fornisci un breve riconoscimento empatico alla risposta, 
                                 senza suonare giudicante o fare diagnosi.`;
    
    const messages = [...updatedState.messages, { role: 'system', content: acknowledgmentPrompt }];
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 200
    });

    updatedState.messages.push(
      { role: 'system', content: acknowledgmentPrompt },
      { role: 'assistant', content: response.choices[0].message.content }
    );

    // Avanza alla prossima domanda
    if (questionId === 'phqDifficulty') {
      // Non incrementare l'indice, passeremo direttamente a completeAssessment
    } else {
      updatedState.currentQuestionIndex++;
    }

    return {
      message: response.choices[0].message.content,
      conversationState: updatedState
    };
  } catch (error) {
    console.error('Error processing response:', error);
    throw error;
  }
}

/**
 * Gestisce la transizione tra GAD-7 e PHQ-9
 * Questa funzione non viene più chiamata direttamente,
 * ma la manteniamo per compatibilità con eventuali dipendenze
 */
async function handleTransition(state) {
  try {
    const updatedState = {
      ...state,
      currentScale: 'PHQ-9',
      currentQuestionIndex: 0
    };

    return getNextQuestion(updatedState);
  } catch (error) {
    console.error('Error handling transition:', error);
    throw error;
  }
}

/**
 * Pone la domanda finale sulla difficoltà nel PHQ-9
 */
async function askDifficultyQuestion(state) {
  try {
    const difficultyQuestion = `Quanto questi aspetti hanno influenzato la tua capacità di svolgere le normali attività quotidiane?`;
    
    const systemInstruction = `Formula la seguente domanda finale in modo conversazionale: "${difficultyQuestion}". 
                             Spiega che questa è l'ultima domanda del nostro colloquio.`;

    const messages = [...state.messages, { role: 'system', content: systemInstruction }];
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 300
    });

    const updatedMessages = [...state.messages, 
      { role: 'system', content: systemInstruction },
      { role: 'assistant', content: response.choices[0].message.content }
    ];

    return {
      message: response.choices[0].message.content,
      questionId: 'phqDifficulty',
      conversationState: {
        ...state,
        messages: updatedMessages
      }
    };
  } catch (error) {
    console.error('Error asking difficulty question:', error);
    throw error;
  }
}

/**
 * Completa la valutazione e genera il messaggio finale
 */
async function completeAssessment(state) {
  try {
    const completionPrompt = `Genera un messaggio di conclusione che ringrazi 
                           il paziente per aver completato il nostro colloquio. 
                           Sii gentile, empatico e rassicurante. 
                           Suggerisci di restituire il dispositivo al medico.`;

    const messages = [...state.messages, { role: 'system', content: completionPrompt }];
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 250
    });

    // Calcola i punteggi finali
    const gadTotal = state.scores['GAD-7'].reduce((sum, score) => sum + score, 0);
    const phqTotal = state.scores['PHQ-9'].reduce((sum, score) => sum + score, 0);

    return {
      message: response.choices[0].message.content,
      results: {
        gadScore: gadTotal,
        phqScore: phqTotal,
        gadResponses: state.scores['GAD-7'],
        phqResponses: state.scores['PHQ-9'],
        phqDifficultyScore: state.phqDifficultyScore
      },
      conversationState: {
        ...state,
        isCompleted: true,
        messages: [...state.messages, 
          { role: 'system', content: completionPrompt },
          { role: 'assistant', content: response.choices[0].message.content }
        ]
      }
    };
  } catch (error) {
    console.error('Error completing assessment:', error);
    throw error;
  }
}

// Funzioni helper per interpretare i punteggi
function interpretGADScore(score) {
  if (score >= 0 && score <= 4) return 'Livello minimo';
  if (score >= 5 && score <= 9) return 'Livello lieve';
  if (score >= 10 && score <= 14) return 'Livello moderato';
  return 'Livello elevato';
}

function interpretPHQScore(score) {
  if (score >= 0 && score <= 4) return 'Sintomi minimi';
  if (score >= 5 && score <= 9) return 'Sintomi lievi';
  if (score >= 10 && score <= 14) return 'Sintomi moderati';
  if (score >= 15 && score <= 19) return 'Sintomi significativi';
  return 'Sintomi intensi';
}

module.exports = {
  startConversation,
  getNextQuestion,
  processResponse,
  interpretGADScore,
  interpretPHQScore
};