# 14: Transcribe CM's seven player-instruction templates

Type: task
Blocked by: 07
Status: resolved

## Question

Nothing to decide: write down the values of the seven player-instruction templates (Goalkeeper,
Central Defender, Full Back, Defensive Midfielder, Attacking Midfielder, Winger, Striker) shipped in
CM 03/04's `data\tactics\tactical_templates.xml`, decoded through the encoding its own header
comment documents, as values of the instruction set fixed in
[ticket 07](07-player-instructions-and-what-replaces-role-rating.md). Obtain the file the way
[the formations research](../../../docs/research/formations-and-instructions-cm0304-formations-and-tactic-files.md)
did (its Reproducing section). Record per template, per instruction: the stored value, the decoded
value, and whether 0 or an omitted field means "team default". Also record whether patch 4.1.4's copy
differs (the research found it byte-identical). The answer is the table; no game file is copied into
the repo beyond these values.

## Answer

**Source.** `data\tactics\tactical_templates.xml`, 5,354 bytes, SHA-1
`1d94ac2142474602ba13b8677265cfeceab6bfdb`. For the retail 4.1.0 copy, I carved cabinet folder 98
out of `Data1.cab` on `CM0304.iso` and extracted it with macOS `tar`, following
[the formations research](../../../docs/research/formations-and-instructions-cm0304-formations-and-tactic-files.md#reproducing).
In `cm0304 Patch 4.1.4.exe` the file is stored uncompressed as `\data\tactics\tactical_templates.xml`,
with a size field of 5,354. **The 4.1.4 copy is byte-identical to retail** (same SHA-1), and it is
the only copy in the patch. No game file was copied into the repo.

**Encoding, from the file's header comment.** "If any values are set to 0, or not declared they
will set to the team default, or false." The integer fields use 1-based codes: `pass` mixed 1,
short 2, direct 3, long 4; `clos` stand off 1, own half only 2, always 3; `tack` easy 1, normal 2,
hard 3; `mark` zonal 1, man 2; `ment` ultra defensive 1 through gung ho 5; `dist` long kick 1, ask
defenders to collect 2; `crof` deep 1, touchline 2 (spelled "Toucline"); `croa` near post 1,
centre 2, far post 3, man 4. The seven flags are `<true/>` and `<false/>` elements.

In the vocabulary of the
[player-instructions note](../../../.agents/notes/proposed/feature/2026-09-29-cm-player-instructions-per-slot-without-a-fit-rating.md),
a stored 0 means `team` on the five override rows and `default` on Distribution, Cross From and
Cross Aim. A flag stored as `false` means `normal` and `true` means `often`. An omitted field
would mean the same as 0 or false, but **the case never occurs**: every record declares all 15
fields.

Each cell shows the raw value and then the decoded value.

| Instruction | Goalkeeper | Central Defender | Full Back | Defensive Midfielder | Attacking Midfielder | Winger | Striker |
|---|---|---|---|---|---|---|---|
| Passing (`pass`) | 3 direct | 3 direct | 3 direct | 1 mixed | 2 short | 1 mixed | 3 direct |
| Closing Down (`clos`) | 1 stand off | 1 stand off | 1 stand off | 3 always | 0 team | 1 stand off | 0 team |
| Tackling (`tack`) | 2 normal | 2 normal | 2 normal | 2 normal | 2 normal | 2 normal | 2 normal |
| Marking (`mark`) | 1 zonal | 2 man | 1 zonal | 2 man | 0 team | 1 zonal | 0 team |
| Mentality (`ment`) | 3 normal | 2 defensive | 3 normal | 2 defensive | 4 attacking | 4 attacking | 4 attacking |
| Distribution (`dist`) | 1 long kick | 0 default | 0 default | 0 default | 0 default | 0 default | 0 default |
| Cross From (`crof`) | 0 default | 0 default | 1 deep | 0 default | 0 default | 2 touchline | 0 default |
| Cross Aim (`croa`) | 0 default | 0 default | 0 default | 0 default | 0 default | 1 near post | 0 default |
| Cross Ball (`cros`) | false normal | false normal | true often | false normal | false normal | true often | false normal |
| Long Shots (`long`) | false normal | false normal | false normal | true often | true often | false normal | false normal |
| Forward Runs (`forw`) | false normal | false normal | true often | true often | false normal | true often | false normal |
| Run With Ball (`ruwb`) | false normal | false normal | true often | false normal | true often | true often | true often |
| Try Through Balls (`trtb`) | false normal | false normal | false normal | false normal | true often | false normal | false normal |
| Free Role (`free`) | false normal | false normal | false normal | false normal | true often | false normal | false normal |
| Hold Up Ball (`houb`) | false normal | false normal | false normal | false normal | false normal | false normal | true often |

**Where this does not map cleanly onto the note:**

1. **The templates override the team on most rows.** Passing, Tackling and Mentality are set
   explicitly in all seven templates, and Closing Down and Marking in five. Only the Attacking
   Midfielder and Striker use `team`, and only for Closing Down and Marking. If built-in templates
   seed every slot from these values as the note proposes, the Team Instructions for Passing,
   Tackling and Mentality reach only the central-M slots, which start at the defaults. CM applied
   a template only when the user pressed "Set To Preset", so it never showed this effect.
   Whether seeding every built-in slot this way is intended needs a decision against
   [ticket 07](07-player-instructions-and-what-replaces-role-rating.md).
2. **Tackling is stored as 2 (normal) everywhere, never 0.** It decodes cleanly, but it makes
   "normal" an explicit override rather than `team`.
3. **The file says 0 means "team default" on Distribution, Cross From and Cross Aim too.** The
   note calls that state `default` because the team screen has no crossing or distribution row.
   The instructions research suspects a hidden team crossing default. Mapping 0 to `default` is
   correct as long as `default` means "whatever the engine does without an instruction".
4. **Marking has no code for specific marking,** which matches the note: templates allow only
   `team`, zonal and man.
5. **The template names carry localisation annotations** such as
   `Goalkeeper[COMMENT: tactical_templates; Position]`. The display name is the text before the
   bracket.
