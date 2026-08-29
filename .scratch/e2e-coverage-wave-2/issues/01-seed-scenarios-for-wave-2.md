# Issue: Seed scenarios for wave-2 features

Type: grilling
Status: claimed

## Question

What new seed scenarios do we need for the wave-2 e2e features, and what state does each guarantee? The wave 1 seeds (`fresh`, `before-matchday`, `before-season-end`, `concluded`) don't provide transfer activity — AI clubs haven't placed bids, and contracts haven't expired. We need at minimum:

- A seed where free agents exist on the market (players with `clubId === null` available to sign)
- A seed where AI clubs have placed incoming bids on the user's players
- A seed where outgoing bids have been countered

For each: what calendar state, what generator steps, and what guarantees does it make about the UI state when loaded?