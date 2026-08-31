# 13 — Absence: Screens 9, 10 (identity screens)

Type: task
Status: resolved
Assignee: joao
Blocked by: 03

## Question

Two imported specs describe manager-identity screens with no route or component:

- **Screen 9: Manager Nationality and Languages** — `09_manager_nationality_and_languages.md`, 48 sections. No nationality/languages UI, no schema column, no RPC. The closest living concept is manager name (Screen 8's field).
- **Screen 10: Manager Background** — `10_manager_background.md`, 47 sections. No background form, date-of-birth picker, or biography surface. The Archetype picker in `CreationStep1.tsx` implements **Manager Archetype** (`CONTEXT.md`), a different concept.

Both carry blanket-trim rows in the ledger already. This ticket scans the surviving sections, distributes them across `out-of-scope` / `contradicted` / `deferred`, registers survivors, and flips the cluster to `Reviewed`.

**Distinguish carefully**: neither screen's spec is the same as Manager Archetype or Manager Profile (Screen 19), which were decided in earlier tickets. The Archetype picker is a different concept from Background; Manager Profile (Screen 19) is already defined per ticket 06 and must not be re-audited here.

## Done when

Both screens have a `Reviewed` status in `RECONCILIATION.md`, each with rows for every section the implementation does not follow, and no `unscheduled` rows remain.

## Answer

**Both screens fully absent — every surviving section classified `contradicted`, registered in the ledger, status flipped to `Reviewed`.**
- Screen 9 (46 surviving sections): no nationality/languages concept exists in the codebase; the manager is defined by Archetype and Pillars only.
- Screen 10 (45 surviving sections): no background concept exists; the codebase's 4-Pillar model (CONTEXT.md) is a different design from the spec's 5-attribute background system.
- No `deferred` rows: the codebase made incompatible design decisions (three-step creation flow, Archetype/Pillar identity model).
- No note written: fact-finding audit confirming absence against existing decisions.