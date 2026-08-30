# Decision Request: <question in one line>

Written when a [stop condition](../AUTONOMOUS-AGENT.md) fires. Saved to
`.scratch/<effort>/decision-request-<NN>-<slug>.md`. Work on the blocked path halts here — everything
*not* blocked by this question keeps moving.

A decision request is not a request for permission. It is a request for a **decision only a human
can make**: one that changes what the game is, not how it is built.

## Question

State it so it can be answered without reading the rest of this file.

## Why this is blocking

Which stop condition fired, and what breaks if it is guessed wrong.

## What is already settled

The CONTEXT.md terms, ADRs, Agent Notes, and tickets that constrain the answer. Do not reopen these.

## Options

For each plausible answer:

### Option A — <name>

- **What the player experiences**:
- **What it costs to build**:
- **What it forecloses**:
- **Save compatibility**:

### Option B — <name>

…

## Recommendation

Say which one you would pick and why. A decision request with no recommendation makes the human do
work you already did.

## What is blocked, and what is not

- Blocked: 
- Proceeding meanwhile: 
