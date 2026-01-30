# Wireframes – fő flow

## 01-main-flow.png
**Cél:** A felhasználó rálát a meglévő elemekre és új elemet indíthat.  
**Interakciók:** keresés, lapozás, „Új elem” CTA.  
**Állapotok:** normál (tartalom), loader átmenet.  
**Hivatkozások:** US-03/AC1, Spec v0.2 – Fő AC-k/1, tests: `tests/acceptance/list_view.feature`.

## 02-empty-state.png
**Cél:** Az első belépő értse, mit tegyen.  
**Interakciók:** „Új elem hozzáadása” CTA.  
**Állapotok:** üres; információs üzenet.  
**Hivatkozások:** US-01/AC1, tests: `tests/acceptance/empty_state.feature`.

## 03-error-state.png
**Cél:** Hibából gyors visszaút.  
**Interakciók:** „Próbáld újra” gomb, súgó link.  
**Állapotok:** hiba; visszajelzés + retry.  
**Hivatkozások:** US-01/AC2, tests: `tests/unit/error_handler.spec.ts`.

## 04-form-validation.png (opcionális)
**Cél:** Adatbevitel minőség biztosítása.  
**Interakciók:** valid/invalid beküldés, mezőszintű hibák.  
**Állapotok:** invalid (piros label), success toast.  
**Hivatkozások:** US-02/AC1–AC2, tests: `tests/acceptance/form_validation.feature`.

