# Sprint 2 – részletes hallgatói útmutató (6 hét) 

## Cél

A 2. sprint célja egy működő MVP‑vertikális szelet megvalósítása, dokumentálása és automatizált ellenőrzése úgy, hogy közben valódi szakmai rutinokat tanultok: követelmények specifikálása (Spec v0.2, User Story + AC), tudatos döntéshozatal (ADR), minőségbiztosítás (tesztek + coverage), üzemeltetés (IaC/terraform plan), gépi ellenőrzés (smoke), átlátható beadás (PR + CI). A rendszer technológiától független: működik React+Firebase/Vercel/Netlify, VM‑es backend, vagy akár Docker esetén is – Docker nem kötelező.

## 0. Tanulási eredmények (mit fogsz tudni?)

- Élő, karbantartható specifikációt írni és frissíteni (v0.2)
- User story gondolkodás, AC (Acceptance Criteria) megfogalmazás (Given–When–Then)
- ADR (Architecture Decision Record) készítése: alternatívák, következmények, trade‑off
- Tesztstratégia: unit/komponens tesztek, lefedettség (≥60%), állapottesztek (üres/hiba)
- Automatizált ellenőrzés: füstteszt (smoke), CI pipeline, egylépéses helyi futás
- IaC (Infrastructure as Code): terraform validate + plan (nem kötelező apply)
- Követhetőség (traceability): Story → AC → Teszt → Kód → CI lánc dokumentálása
- Beadás/PR kultúra: változás összefoglalása, bizonyítékok linkelése, ismert korlátok

## 1. Sprint kimenetek (deliverable‑ok) – áttekintés

| # | Deliverable | Kötelező? | Rövid leírás |
|---:|---|:--:|---|
| 1 | Spec v0.2 (`docs/spec/product_spec_v0.2.md`) | ✔️ | Cél, Scope (In/Out), User Story térkép, 3–5 NFR, fő AC-k |
| 2 | User Story + AC (`docs/stories/user_stories.md`, `tests/acceptance/*.feature`) | ✔️ | Min. 5 story (INVEST), mindhez AC; legalább 2 AC automatizálva |
| 3 | ADR (`docs/adr/*`) | ✔️ | Min. 2 új ADR: (1) platform döntés, (2) IaC/deploy stratégia |
| 4 | Teszt + Coverage (`reports/junit.xml`, `reports/coverage.xml`) | ✔️ | ≥5 teszt, 0 fail/error; coverage ≥60% |
| 5 | Smoke & Preview (`deploy/target.yaml`, `scripts/smoke.yaml` vagy `.http`) | ✔️ | Build/serve/smoke lépések és 200 OK ellenőrzés |
| 6 | MVP vertikális szelet (kód + UI) | ✔️ | Egy végigérő üzleti flow, üres/hiba állapotokkal |
| 7 | IaC/terraform plan (`infra/terraform/*`) | ✔️ | `terraform validate` + `terraform plan` siker, plan artefakt |
| 8 | Traceability + DoR/DoD (`docs/traceability.md`, `docs/process/dor_dod.md`) | ✔️ | Story → AC → Teszt → Kód → CI lánc, és definíciók |
| 9 | AI‑napló (`ai/ai_log.jsonl`) | ✔️ | N≥3 bejegyzés: eszköz, döntés, hivatkozások, tanulság |
| 10 | Wireframe csomag (`wireframes/*.png|jpg`) | ✔️ | Min. 3 kép; normál/üres/hiba állapotok |
| 11 | PR + CI (beadás) | ✔️ | PR leírás, linkek a jelentésekhez, screenshot/GIF |

Miért így? Ezek a kimenetek lefedik az ipari életciklus fő lépéseit: mit építünk (spec), kinek és hogyan (story+AC), mivel és miért (ADR), helyesen működik‑e (teszt), futhat‑e (smoke), üzemeltethető‑e (IaC), visszakereshető‑e (traceability), beadható‑e (PR+CI).

## 2. Részletes elvárások és példák

### 2.1 Spec v0.2 – `docs/spec/product_spec_v0.2.md`
- Mit tartalmazzon?
  - Cél és fókusz: 1 bekezdésben a probléma és a várt érték (miért kell ez a szelet)
  - Scope (In/Out): mit csinálunk most, mit nem (koncentrált fókusz)
  - User Story térkép: 3–7 fő sztori (pl. US‑01 üres állapot, US‑02 első elem létrehozása…)
  - NFR-ek (nem‑funkcionális): 3–5 mérhető cél (pl. TTFB < 1.5s preview környezetben; smoke pass ≥ 95%)
  - Fő AC‑k: 2–4 Given–When–Then a kritikus flow‑ra
- Miért fontos? A spec iránytű: miben állapodtunk meg, mit fogadunk el késznek.
- Minta váz a `templates/docs/spec/product_spec_v0.2.md` fájlban.

### 2.2 User Story + Acceptance Criteria (AC)
- Elvárás: min. 5 story (INVEST), mindhez AC, legalább 2 AC automatizálva (Playwright/Cypress/E2E vagy domain‑szintű unit).
- INVEST ellenőrzőlista: Independent, Negotiable, Valuable, Estimable, Small, Testable
- Minta story + AC és Gherkin a `templates/docs/stories/user_stories.md` és `templates/tests/acceptance/empty_state.feature` fájlokban.

### 2.3 ADR – Architecture Decision Record
- Elvárás: min. 2 új ADR:
  - Deployment cél (pl. Firebase Hosting vs. Vercel vs. VM)
  - IaC/telepítés stratégia (Terraform plan minimum)
- ADR sablonok a `templates/docs/adr/` mappában.

### 2.4 Tesztek + Coverage
- Elvárás:
  - `reports/junit.xml` – ≥5 teszt, 0 failure, 0 error
  - `reports/coverage.xml` – line coverage ≥60% (Cobertura/JaCoCo kompatibilis)
  - Legalább 1 hiba és 1 üres állapot tesztelve
- Miért fontos? A teszt a minőség első védelmi vonala; a coverage a vakfoltok ellen véd.
- Tippek: először a kritikus útvonal tesztek; kerüld az over‑mockolást; gyors, determinisztikus tesztek.

### 2.5 Smoke + Preview (technológiától független)
- Elvárás:
  - `deploy/target.yaml` – build/serve parancsok, base_url, smoke specifikáció
  - `scripts/smoke.yaml` vagy `.http` – legalább egy élő ellenőrzés (`/` vagy `/healthz` → 200)
- Miért fontos? Gyorsan jelzi, hogy a rendszer életképes‑e (fut‑e egyáltalán?).
- Minták a `templates/deploy/target.yaml` és `templates/scripts/smoke.yaml|.http` fájlokban.

### 2.6 MVP vertikális szelet
- Elvárás: Egy végigérő funkció: UI → (opcionális) API → adat → visszajelzés.
- Legyen látható üres/hiba állapot; az AC‑k alapján végigjátszható.

### 2.7 IaC – Terraform (validate + plan)
- Elvárás:
  - `infra/terraform/` – minimális projekt (`main.tf`, `providers.tf`, `variables.tf`, `README.md`)
  - CI‑ban `terraform validate` + `terraform plan` siker; a `plan.out` artefakt elérhető
  - Nem kell apply: a cél a visszajátszhatóság és tervezhetőség
- Miért fontos? Az IaC biztosítja, hogy a környezet dokumentált és ismételhető legyen.
- Minta a `templates/infra/terraform/` mappában.

### 2.8 Traceability + DoR/DoD
- `docs/traceability.md` – táblázat: Story → AC → Teszt → Kód → CI
- `docs/process/dor_dod.md` – DoR/DoD definíciók
- Minták a `templates/docs/traceability.md` és `templates/docs/process/dor_dod.md` fájlokban.

### 2.9 AI‑napló – `ai/ai_log.jsonl`
- Elvárás: soronként JSON: `timestamp`, `tool`, `task/prompt_summary`, `decision`, `impact`, `human_validation`, opcionálisan `artifacts[]`; N≥3 bejegyzés.
- Minta bejegyzések a `templates/ai/ai_log.jsonl` fájlban.

### 2.10 Wireframe – `wireframes/*.png|jpg`
- Cél: a fő felhasználói folyamat vizuális, gyorsan módosítható vázlata, amely összeköti a Spec v0.2‑t, a User Story + AC‑ket és a fejlesztési/teszt feladatokat.
- Elvárások (kötelező):
  - Minimum: ≥3 képernyő (ajánlott: 4–6), lefedve a fő end‑to‑end flow‑t
  - Állapotok: normál, üres és hiba
  - Hivatkozások: képenként Story/AC referencia (pl. US‑01/AC1)
  - Kísérő leírás: `wireframes/README.md` – képenként 4 blokk (Cél, Interakciók, Állapotok, Megjegyzések)
- Minta a `templates/wireframes/README.md` fájlban.

## 3. Kiértékelési rubrika (irányadó súlyok)

- Spec v0.2: 8% – teljesség, mérhetőség, érthetőség
- User Story + AC: 10% – INVEST, AC egyértelműség, 2 AC automatizálva
- ADR: 7% – döntés indoklása, alternatívák, következmények
- Tesztek + coverage: 18% – ≥5 teszt; coverage ≥60%; állapottesztek
- Smoke + preview: 8% – scriptelt, determinisztikus ellenőrzés
- MVP szelet: 22% – végigérő flow, hiba/üres állapotok, kódminőség
- IaC/terraform plan: 15% – validate+plan; olvasható README
- Traceability + DoR/DoD: 7% – lánc teljessége, definíciók alkalmazása
- PR + CI minőség: 3% – leírás, linkek, bizonyítékok

Jegy javaslat:
- 90–100: kiváló (75–85%+ coverage, tiszta interfészek, extra automatizmusok)
- 80–89: jó (stabil pipeline, 70–80% coverage, koherens doksi)
- 70–79: megfelelt (minimumok teljesítve, kisebb hiányok)
- 60–69: épphogy megfelelt (határértékes teljesítések)
- <60: nem megfelelt (kritikus hiány a deliverable‑okban)

## 4. Lépésről lépésre – megvalósítási forgatókönyv

1) Spec v0.2 frissítése – Cél, Scope, Story térkép, NFR, fő AC-k
2) Storyk bontása feladatokra – DoR szerint előkészítve
3) ADR‑ek megírása – platform + IaC stratégia (alternatívák, következmények)
4) Wireframe – üres/hiba állapotokat is jelöld
5) Kódolás (MVP-szelet) – először a kritikus útvonal, látható visszajelzések
6) Tesztírás – unit/komponens (≥5), állapottesztek, coverage ≥60%
7) Smoke + Preview – `deploy/target.yaml` + `scripts/smoke.yaml|.http`
8) IaC/terraform – validate + plan (artefakt)
9) Traceability + DoR/DoD – táblázat és definíciók feltöltése
10) AI‑napló – N≥3 bejegyzés (eszköz, döntés, indoklás)
11) PR beadás – leírás, linkek a jelentésekre, screenshot/GIF, Known issues

## 5. CI‑ötletek (technológiafüggetlen)

- Markdown lint – `docs/**/*.md`
- Gherkin lint – `tests/acceptance/*.feature`
- Coverage merge – ha több nyelv/tesztfajta van
- Smoke futtatás – `deploy/target.yaml` alapján
- Terraform validate/plan – `infra/terraform` mappa

Tipp: legyen egyparancsos helyi futás (pl. `make ci-local` / `npm run ci-local`), ami ugyanazt csinálja, mint a CI (build → test → coverage → preview → smoke → plan).

## 6. Anti‑patternök és ellenpéldák

- „Doksi a végén” – mindig élőben frissítsd (Spec v0.2, ADR, Trace)
- „Snapshot‑only tesztek” – kell viselkedés teszt (input→output)
- „Smoke = kézzel nyitottam meg” – legyen script (yaml/http)
- „Plan nélkül deploy” – legalább terraform plan készüljön
- „LLM dönt helyettünk” – AI‑naplóban indokold, miért vetted át/utasítottad el

## 7. Gyakran ismételt kérdések (GYIK)

- Kell Docker? Nem. A célplatformot az ADR‑ben választod; a `deploy/target.yaml` csak a build/preview/smoke lépéseket írja le.
- Mennyi teszt kell? Minimum 5, de törekedj 8–10-re. A coverage legalább 60% – ha egyszerű a szelet, legyen több.
- Mennyi ADR? Minimum 2 új ADR – ha több döntést hozol, dokumentáld.
- Kötelező AC‑t automatizálni? Igen, legalább kettőt.
- Mit tegyek, ha nincs backend? Akkor is legyen smoke (`/` → 200), és NFR‑t mérhetsz pl. TTFB‑re.

## 8. Gyakorló sablonok (másolható)

### 8.1 User Story + AC

```
### US‑02: Első elem létrehozása
Mint kezdő felhasználó, gyorsan szeretnék egy új elemet felvinni,
hogy kipróbáljam a rendszert.

**AC1 – Valid input**
Given üres lista
When a „Hozzáadás” formot helyes adatokkal beküldöm
Then az elem megjelenik a listában és visszajelzést kapok „Sikeres mentés”

**AC2 – Invalid input**
Given a kötelező mező üres
When elmentem a formot
Then piros hibaüzenet és nem jön létre új elem
```

### 8.2 ADR sablon

```
# ADR 0002 – IaC stratégia
Dátum: 2025‑10‑28
Kontextus: preview környezet tervrajza kell, alacsony költséggel.
Döntés: terraform plan a preview infra‑ra, apply később.
Alternatívák: kézi provisioning / más IaC (Pulumi) – okok, hátrányok.
Következmények: olcsóbb, de később finomítani kell a modulokat.
```

### 8.3 `deploy/target.yaml` (SPA példa)

```
type: static_hosting
build:
  command: "npm ci && npm run build"
  artifacts: ["dist"]
serve:
  command: "npm run preview"
  base_url: "http://localhost:5173"
smoke:
  path: "/"
  expect_status: 200
iac:
  tool: "terraform"
  dir: "infra/terraform"
  plan_out: "infra/terraform/plan.out"
```

### 8.4 `scripts/smoke.http` (alternatíva a YAML‑hoz)

```
GET http://localhost:5173/
Accept: text/html

###
# Várt: 200
```

## 9. Beadás (PR) – ellenőrzőlista

- Cím: „S2 – MVP szelet + Spec v0.2 + ADR + IaC plan”
- Leírás: rövid összefoglaló; linkek a jelentésekre (`reports/*`, plan artefakt)
- Képernyőkép/GIF a fő flow‑ról
- Known issues / Next steps szekció
- Minden CI lépés zöld (test, coverage, smoke, terraform plan)

## 10. Záró gondolatok

Ez az útmutató nem csak a beadásról szól, hanem arról, hogyan gondolkodjunk mérnökként: fókusz, mérhetőség, automatizálás, követhetőség. Ha a minimumok megvannak, építs a stabil alapokra: több AC automatizálása, coverage növelése, szerződéses tesztek (schema), Lighthouse audit, kisebb e2e. A lényeg: kicsi, de komplett vertikális szeletek, amelyek önállóan is értelmesen működnek és tanulságosak.
