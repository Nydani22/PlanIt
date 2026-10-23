const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const createEventsTool = {
  name: "createEvents",
  description: "Létrehoz egy vagy több ÚJ eseményt a felhasználó naptárában. FONTOS: Szinkronizáláskor (képek, órarendek feldolgozásakor) CSAK a naptárban még egyáltalán nem szereplő, teljesen új eseményeket tedd ebbe a listába! Ha az esemény már létezik (azonos néven és napon), de más időpontban, ne ezt az eszközt használd, hanem az 'updateEvents'-t!",
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
            fromDate: { 
              type: "STRING", 
              description: "Kezdő dátum a felhasználó HELYI IDEJÉBEN (YYYY-MM-DDTHH:mm:ss formátumban, pl. 2026-10-25T14:30:00)." 
            },
            toDate: { 
              type: "STRING", 
              description: "Befejező dátum a felhasználó HELYI IDEJÉBEN (YYYY-MM-DDTHH:mm:ss formátumban)." 
            },
            category: { 
              type: "STRING", 
              description: "Az esemény kategóriája. KÖTELEZŐEN csak a megadott listából választhatsz egyet, ami a legjobban illik! Ha bizonytalan vagy, használd az 'OTHER' értéket.",
              enum: [
                "WORK", "MEETING", "PERSONAL", "FAMILY", "IMPORTANT", 
                "HOLIDAY", "HEALTH", "STUDY", "SPORTS", "FINANCE", 
                "CELEBRATION", "TRAVEL", "OTHER"
              ]
            },
            color: { type: "STRING", description: "Az esemény egyedi színe (pl. HEX kóddal), ha a felhasználó külön kéri." },
            sendNotification: { type: "BOOLEAN", description: "Igaz, ha a felhasználó értesítést kér az eseményről." },
            allowOverlap: { type: "BOOLEAN", description: "Igaz, ha az esemény ütközhet más naptári eseményekkel." },
            groupName: { type: "STRING", description: "A csoport neve, ha az eseményt egy adott csoport számára szervezed. KÖTELEZŐ megadni, ha a felhasználó egy csapattal közös programot kér, így a tagok automatikusan meghívást kapnak!" },
            optionalAttendees: { 
              type: "ARRAY", 
              description: "Azoknak a tagoknak a nevei, akiknek a részvétele csak OPCIONÁLIS (nem kötelező). Ha a felhasználó ilyet kér, tedd a nevüket ebbe a listába!",
              items: { type: "STRING" }
            },
            recurrence: {
              type: "OBJECT",
              description: "Ismétlődés beállításai (ha az esemény rendszeres).",
              properties: {
                frequency: { 
                  type: "STRING", 
                  description: "Az ismétlődés gyakorisága.", 
                  enum: ["NONE", "DAILY", "WEEKLY"] 
                },
                daysOfWeek: {
                  type: "ARRAY",
                  description: "A hét mely napjain ismétlődik. 0=Vasárnap, 1=Hétfő, 2=Kedd, 3=Szerda, 4=Csütörtök, 5=Péntek, 6=Szombat. Csak WEEKLY esetén releváns.",
                  items: { type: "INTEGER" }
                },
                untilDate: { 
                  type: "STRING", 
                  description: "Az ismétlődés befejező dátuma a felhasználó HELYI IDEJÉBEN (YYYY-MM-DDTHH:mm:ss formátumban). Ha nincs végdátum, hagyd üresen." 
                }
              }
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
  description: "Módosítja vagy áthelyezi egy fős esemény adatait. Használd ezt szinkronizáláskor is, ha egy a naptárban már meglévő esemény (pl. egy adott napi műszak) időpontja megváltozott az új listán/képen! CSOPORTOS ESEMÉNYEKET (ahol isGroupEvent: true) SZIGORÚAN TILOS MÓDOSÍTANI VELE! A módosítandó események 'eventId'-jét a rendszerutasításban kapott eseménylistából kell kikeresned!",
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
            fromDate: { 
              type: "STRING", 
              description: "Kezdő dátum a felhasználó HELYI IDEJÉBEN (YYYY-MM-DDTHH:mm:ss formátumban)." 
            },
            toDate: { 
              type: "STRING", 
              description: "Befejező dátum a felhasználó HELYI IDEJÉBEN (YYYY-MM-DDTHH:mm:ss formátumban)." 
            },
            description: { type: "STRING", description: "Új leírás (csak ha változik)." },
            location: { type: "STRING", description: "Új helyszín (csak ha változik)." },
            color: { type: "STRING", description: "Új egyedi szín (csak ha változik)." },
            sendNotification: { type: "BOOLEAN", description: "Új értesítési beállítás (csak ha változik)." },
            allowOverlap: { type: "BOOLEAN", description: "Új ütközésengedélyezési beállítás (csak ha változik)." },
            category: { 
              type: "STRING", 
              description: "Új kategória (csak ha változik).",
              enum: [
                "WORK", "MEETING", "PERSONAL", "FAMILY", "IMPORTANT", 
                "HOLIDAY", "HEALTH", "STUDY", "SPORTS", "FINANCE", 
                "CELEBRATION", "TRAVEL", "OTHER"
              ]
            },
            recurrence: {
              type: "OBJECT",
              description: "Új ismétlődési beállítások (csak ha változik).",
              properties: {
                frequency: { 
                  type: "STRING", 
                  enum: ["NONE", "DAILY", "WEEKLY"] 
                },
                daysOfWeek: {
                  type: "ARRAY",
                  items: { type: "INTEGER" }
                },
                untilDate: { type: "STRING" }
              }
            }
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
      startDate: { type: "STRING", description: "A lekérdezés kezdete HELYI IDŐBEN (YYYY-MM-DDTHH:mm:ss formátumban)." },
      endDate: { type: "STRING", description: "A lekérdezés vége HELYI IDŐBEN (YYYY-MM-DDTHH:mm:ss formátumban)." }
    },
    required: ["startDate", "endDate"]
  }
};

const deleteEventsTool = {
  name: "deleteEvents",
  description: "Töröl egy vagy TÖBB meglévő eseményt a naptárból. Használd ezt szinkronizáláskor is, ha egy a naptárban szereplő esemény (pl. egy adott napi műszak) az új listán/képen már nem szerepel (szabadnap lett)! A törlendő események 'eventId'-jét a rendszerutasításban kapott eseménylistából kell kikeresned! CSOPORTOS ESEMÉNYEKET (isGroupEvent: true) TILOS TÖRÖLNI!",
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

const getUserGroupsTool = {
  name: "getUserGroups",
  description: "Lekérdezi azokat a csoportokat, amelyeknek a felhasználó tagja vagy tulajdonosa. Használd ezt, ha a felhasználó a csoportjairól, közösségeiről kérdez (pl. 'Milyen csoportokban vagyok benne?').",
  parameters: {
    type: "OBJECT",
    properties: {}
  }
};

const findAvailableTimeTool = {
  name: "findAvailableTime",
  description: "Szabad időpontokat keres a felhasználó, vagy egy megadott csoport számára. Akkor használd, ha a felhasználó megkérdezi, hogy 'Mikor érek rá jövő héten?', vagy 'Mikor van szabad időpontunk a Projekt X csapattal?'.",
  parameters: {
    type: "OBJECT",
    properties: {
      searchStart: { type: "STRING", description: "Keresés kezdete HELYI IDŐBEN (YYYY-MM-DDTHH:mm:ss formátumban). A legkisebb megadható időpont a JELENLEGI pillanat." },
      searchEnd: { type: "STRING", description: "Keresés vége HELYI IDŐBEN (YYYY-MM-DDTHH:mm:ss formátumban)." },
      durationMinutes: { type: "INTEGER", description: "Keresett időtartam percben (pl. 30, 60, 90)." },
      groupName: { type: "STRING", description: "A csoport neve, amellyel a találkozót tervezik. Ha csak a saját naptárában keres, hagyd üresen!" },
      allowedDays: { 
        type: "ARRAY", 
        description: "Engedélyezett napok HELYI IDŐ SZERINT (0=Vasárnap, 1=Hétfő, ..., 6=Szombat).",
        items: { type: "INTEGER" }
      },
      startHour: { type: "INTEGER", description: "Napi keresés kezdő órája HELYI IDŐBEN! (pl. 8 vagy 9)." },
      endHour: { type: "INTEGER", description: "Napi keresés befejező órája HELYI IDŐBEN! (pl. 16 vagy 17)." }
    },
    required: ["searchStart", "searchEnd", "durationMinutes"]
  }
};

const syncScheduleTool = {
  name: "syncSchedule",
  description: "Ezt használd KÖTELEZŐEN, ha a felhasználó egy beosztás (pl. havi/heti munkabeosztás, órarend) szinkronizálását kéri! Ne a create/update/delete eszközöket hívd meg külön, hanem csak olvasd le a képről az ÖSSZES eseményt, és küldd be ide. A szerver automatikusan megoldja a duplikációk szűrését és a frissítéseket.",
  parameters: {
    type: "OBJECT",
    properties: {
      periodStart: { type: "STRING", description: "A beküldött beosztás legelső napjának kezdete HELYI IDŐBEN (YYYY-MM-DDTHH:mm:ss)." },
      periodEnd: { type: "STRING", description: "A beküldött beosztás legutolsó napjának vége HELYI IDŐBEN (YYYY-MM-DDTHH:mm:ss)." },
      targetEventName: { type: "STRING", description: "Az események egységes neve (pl. 'Munka', 'Órarend')." },
      shifts: {
        type: "ARRAY",
        description: "A képről/szövegből leolvasott összes műszak vagy esemény.",
        items: {
          type: "OBJECT",
          properties: {
            eventName: { type: "STRING" },
            fromDate: { type: "STRING", description: "Kezdés HELYI IDŐBEN (YYYY-MM-DDTHH:mm:ss)." },
            toDate: { type: "STRING", description: "Befejezés HELYI IDŐBEN (YYYY-MM-DDTHH:mm:ss)." },
            category: { 
              type: "STRING", 
              description: "Az esemény kategóriája. KÖTELEZŐEN csak a megadott listából választhatsz egyet.",
              enum: [
                "WORK", "MEETING", "PERSONAL", "FAMILY", "IMPORTANT", 
                "HOLIDAY", "HEALTH", "STUDY", "SPORTS", "FINANCE", 
                "CELEBRATION", "TRAVEL", "OTHER"
              ]
            },
            location: { type: "STRING", description: "Helyszín, ha szerepel a beosztáson (pl. terem, épület)." },
            description: { type: "STRING", description: "Bármilyen extra megjegyzés vagy leírás a műszakhoz/órához." },
            isAllDay: { type: "BOOLEAN", description: "Igaz, ha a beosztás szerint az adott nap egész napos (pl. 'Szabadság' vagy 'Ünnep')." }
          },
          required: ["eventName", "fromDate", "toDate"]
        }
      }
    },
    required: ["periodStart", "periodEnd", "targetEventName", "shifts"]
  }
};


const fallbackModels = [
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite'
];

const getModel = (modelName) => {
  return genAI.getGenerativeModel({ 
    model: modelName,
    tools: [
      {
        functionDeclarations: [createEventsTool, updateEventsTool, getEventsTool, deleteEventsTool, getUserGroupsTool, findAvailableTimeTool, syncScheduleTool]
      }
    ]
  });
};

const generateAIContent = async (contents) => {
  const TIMEOUT_MS = 10000; 

  for (const modelName of fallbackModels) {
      try {
          const currentModel = getModel(modelName);
          const response = await Promise.race([
              currentModel.generateContent(contents),
              new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
              )
          ]);
          return response;
          
      } catch (error) {
          if (error.message === 'TIMEOUT' || error.status === 429 || error.status === 503 || error.status === 404) {
            console.warn(`[AI Váltás] Hiba vagy időtúllépés a(z) ${modelName} modellnél. Ugrás a következőre...`);
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