const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const createEventsTool = {
  name: "createEvents",
  description: "Létrehoz egy vagy több eseményt a felhasználó naptárában. Akkor használd, ha a felhasználó időponto(ka)t akar rögzíteni. Ha egy képen több esemény/műszak van, KÖTELEZŐ mindet beletenni a listába!",
  parameters: {
    type: "OBJECT",
    properties: {
      events: {
        type: "ARRAY",
        description: "Az elmentendő események listája.",
        items: {
          type: "OBJECT",
          properties: {
            eventName: { type: "STRING", description: "Az esemény címe." },
            description: { type: "STRING", description: "Részletes leírás." },
            location: { type: "STRING", description: "Helyszín." },
            isAllDay: { type: "BOOLEAN", description: "Egész napos-e." },
            fromDate: { type: "STRING", description: "Kezdő dátum ISO 8601 formátumban (UTC-ben)." },
            toDate: { type: "STRING", description: "Befejező dátum ISO 8601 formátumban (UTC-ben)." },
            category: { 
              type: "STRING", 
              description: "Az esemény kategóriája. KÖTELEZŐEN csak a megadott listából választhatsz egyet, ami a legjobban illik! Ha bizonytalan vagy, használd az 'OTHER' értéket.",
              enum: [
                "WORK", "MEETING", "PERSONAL", "FAMILY", "IMPORTANT", 
                "HOLIDAY", "HEALTH", "STUDY", "SPORTS", "FINANCE", 
                "CELEBRATION", "TRAVEL", "OTHER"
              ]
            }
          },
          required: ["eventName", "isAllDay", "fromDate", "toDate", "category"]
        }
      }
    },
    required: ["events"]
  }
};

const updateEventsTool = {
  name: "updateEvents",
  description: "Módosítja vagy áthelyezi egy vagy TÖBB meglévő esemény adatait. Ha a felhasználó egyszerre több esemény (pl. 'az összes csütörtöki') eltolását kéri, az összeset tedd bele a listába! A módosítandó események 'eventId'-jét a rendszerutasításban kapott eseménylistából kell kikeresned!",
  parameters: {
    type: "OBJECT",
    properties: {
      updates: {
        type: "ARRAY",
        description: "A módosítandó események listája.",
        items: {
          type: "OBJECT",
          properties: {
            eventId: { type: "STRING", description: "A módosítandó esemény adatbázis azonosítója (_id). KÖTELEZŐ!" },
            eventName: { type: "STRING", description: "Új cím (csak ha változik)." },
            fromDate: { type: "STRING", description: "Új kezdő dátum ISO 8601 (UTC) (csak ha változik)." },
            toDate: { type: "STRING", description: "Új befejező dátum ISO 8601 (UTC) (csak ha változik)." },
            description: { type: "STRING", description: "Új leírás (csak ha változik)." }
          },
          required: ["eventId"]
        }
      }
    },
    required: ["updates"]
  }
};

const getEventsTool = {
  name: "getEvents",
  description: "Lekérdezi a felhasználó naptáreseményeit egy megadott időszakra. Használd ezt, ha a felhasználó a programjairól, szabadidejéről kérdez, vagy ha a jövőbeli/múltbeli naptárára kíváncsi.",
  parameters: {
    type: "OBJECT",
    properties: {
      startDate: { type: "STRING", description: "A lekérdezés kezdete ISO 8601 formátumban (UTC)." },
      endDate: { type: "STRING", description: "A lekérdezés vége ISO 8601 formátumban (UTC)." }
    },
    required: ["startDate", "endDate"]
  }
};

const deleteEventsTool = {
  name: "deleteEvents",
  description: "Töröl egy vagy TÖBB meglévő eseményt a naptárból. Akkor használd, ha a felhasználó események törlését, eltávolítását vagy lemondását kéri. A törlendő események 'eventId'-jét a rendszerutasításban kapott eseménylistából kell kikeresned!",
  parameters: {
    type: "OBJECT",
    properties: {
      eventIds: {
        type: "ARRAY",
        description: "A törlendő események adatbázis azonosítóinak (_id) listája.",
        items: {
          type: "STRING"
        }
      }
    },
    required: ["eventIds"]
  }
};


const fallbackModels = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

const getModel = (modelName) => {
  return genAI.getGenerativeModel({ 
    model: modelName,
    tools: [{
      functionDeclarations: [createEventsTool, updateEventsTool, getEventsTool, deleteEventsTool]
    }]
  });
};

const generateAIContent = async (contents) => {
  for (const modelName of fallbackModels) {
      try {
          const currentModel = getModel(modelName);
          return await currentModel.generateContent(contents);
      } catch (error) {
          if (error.status === 429 || error.status === 503 || error.status === 404) {
              console.warn(`[AI Váltás] Hiba a(z) ${modelName} modellnél (${error.status}). Próbálkozás a következővel...`);
              continue;
          }
          throw error;
      }
  }
  throw new Error('Jelenleg minden AI modellünk leterhelt vagy elérhetetlen. Kérlek, próbáld újra egy picit később!');
};

module.exports = {
  generateAIContent,
  genAI
};