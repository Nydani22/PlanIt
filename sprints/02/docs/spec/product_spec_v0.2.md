# Product Spec v0.2 

## Cél
Rövid, 4–6 soros összefoglaló a felhasználói értékről és az MVP-vertikális szelet céljáról.

## Scope (In/Out)
- In: EK diagram, use-case diagram, 1 vertikális szelet (Bejelentkezés, manuális időpont hozzáadás, naptár megjelenítés)
- Out: Dinamikus szabad időpont keresés

## User Story térkép
- US‑01: Üres állapot megértése
- US‑02: Manuális időpont hozzáadás
- US‑03: Naptár megjelenítése

## NFR (mérhető)
- NFR‑1: TTFB < 1.5s dev‑previewben (mérés: Lighthouse)
- NFR‑2: Smoke pass ≥ 95% a CI 10 futása alatt
- NFR‑3: Build idő < 2 perc (CI)

## Fő AC-k (Given–When–Then)
- AC1: Üres állapot látható, CTA-val
- AC2: Hiba esetén visszajelzés + retry
- AC3: Sikeres mentés után lista frissül és toast jelenik meg
