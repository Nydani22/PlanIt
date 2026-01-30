# User Stories (Sprint 2) 

> Minimum: 5 story (INVEST). Legalább 2 story AC-ját automatizáld.

## INVEST ellenőrzőlista
- Independent, Negotiable, Valuable, Estimable, Small, Testable

---

### US‑01: Üres állapot megjelenítése
**As a** new user
**I want to** see an empty state when I have no data
**So that** I understand the next step (CTA)

Acceptance Criteria (Given–When–Then):
- AC1: Empty state message and CTA are visible
- AC2: Error state shows retry with guidance

Automatizálás: `tests/acceptance/empty_state.feature`

---

### US‑02: Első elem létrehozása
**As a** user
**I want to** add a new item via a form
**So that** I can start using the system

AC példák:
- AC1: Valid input → success toast + item listed
- AC2: Missing required field → field error + no item created

---

### US‑03: Lista megjelenítése
**As a** user
**I want to** browse my items in a list
**So that** I can see my data at a glance

AC példák:
- AC1: Shows latest items first
- AC2: Handles long titles with truncation

---

### US‑04: (helykitöltő)

---

### US‑05: (helykitöltő)
