# Issue: Transfer features coverage spec

Type: grilling
Status: open
Blocked by: 01

## Question

What e2e coverage (smoke and/or journey) do we write for the three transfer-related features — free agent signing, incoming bid response, and counter-offer flow? Each has UI on the Transfers screen but the assertion design depends on the seed scenario (ticket 01).

For each feature, decide:
- Smoke vs journey vs both
- What structural assertions are deterministic (headings, sections, button presence, row counts)
- What exact-value assertions, if any, ride on the seed
- What user interactions the test exercises (click button, wait for result, assert new state)
- Whether to test the bid lifecycle end-to-end (place bid → AI counters → accept → budget settles) as a single journey, or split them