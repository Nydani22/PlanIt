# ADR 0002 – IaC stratégia 

**Dátum:** 2025-01-06  
**Státusz:** Elfogadva

## Kontextus
Preview környezet tervrajzát szeretnénk kód formában rögzíteni (nem kötelező apply), olcsón, ismételhetően.

## Döntés
Terraform használata validate + plan szintig. Az apply későbbi sprintben történik.

## Alternatívák
- Kézi provisioning: gyors indulás, de nincs visszajátszhatóság.

## Következmények
- Pozitív: deklaratív, átlátható infra leírás; plan artefakt auditálható.
- Negatív: kezdeti tanulási igény; modulstruktúra később finomítandó.
