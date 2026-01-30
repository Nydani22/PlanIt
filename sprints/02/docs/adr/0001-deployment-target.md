# ADR 0001 – Deployment cél választása 

**Dátum:** 2025-12-31  
**Státusz:** Elfogadva

## Kontextus
Egyszerű, de gyors megoldás kell hosting-hoz.

## Döntés
Választás: Netlify vagy Firebase Hosting. Indoklás: Korábban használtam, könnyű konfigurálni, ingyenesen elérhető.

## Alternatívák
- Localálisan futtatom a programot, amelyhez a csinálok egy címfordítást ddns-el, így publikusan is elérhető lesz a program. 

## Következmények
- Pozitív: 
- Automatizált CI, automatikusan elindítja a build folyamatot és a publikálást.
- Nem függ az otthoni internetkapcsolattól vagy áramellátástól, így garantált a 99.9%-os uptime.
- Negatív:
- Ingyenes csomag korlátai
