# 0001: Kezdeti technológiai stack kiválasztása

- Dátum: 2025-10-17
- Státusz: Elfogadva

## Kontextus
Olyan keretrendszerre van szükségem, amelyet már ismerek. Fontos, hogy komponenseket is lehessen hozzáadni, így kevesebbet időt kell tölteni a dizájnal. Backend pedig részemről sokat számít, hogy rugalmas legyen, ne kelljen sokat tervezni vele. Az Adatbázis fontos, hogy könnyen haszálható legyen a Backenddel, ne okozzon nagyobb problémát az integrációja.

## Döntés
A frontendhez **Angular** keretrendszert választottam. A backend **Node.js (Express)** köré épül, az adatokat pedig **MongoDB** tárolja.

## Megfontolt alternatívák
- **React + Express**: Használtam már React-et, ismerettség hiánya miatt elvetettem az ötletet. Itt szintén sok modern UI elérhető lett volna.
- **Angular + Express + PostgreSQL**: PostgreSQL-t jobban ismerem, viszont az integrációja nehezebb megvalásítható. 


## Következmények
- Egyszerű kommunikáció a Backend és Frontend között.
- Jól skálázható, moduláris felépítésű, így a későbbiekben könnyen bővíthető új funkciókkal.
- Gyors fejlesztés, a gyakori csomagfrissítések miatt, inkompatibilitások lehetősége megnő, ezért dependency auditokra lesz szükség.
