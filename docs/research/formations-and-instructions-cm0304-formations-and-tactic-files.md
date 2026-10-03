# Research: CM 03/04 formation presets, the tactics slot grid, and `.tac` files

Resolves [ticket 02](../../.scratch/formations-and-instructions/issues/02-cm-0304-default-formations-and-tactic-files.md)
of the formations-and-instructions effort. It records what CM 03/04 shipped and decides nothing
about this codebase.

## Question

What formation presets did Championship Manager 03/04 ship, what cells could a player occupy on the
tactics screen, what did a `.tac` file hold, which presets did the AI use, and did the game have
separate positions per phase of play?

## Labels

- **Verified (CM 03/04)**: read directly from the game's own files: the retail install, the
  official patches, or the executable.
- **Inherited (CM4)**: shipped in CM 03/04 but marked in the files as CM4 material.
- **Later FM**: belongs to Football Manager, not CM 03/04.
- **Unverified**: my inference, or a claim with no primary source. Treat it as a hypothesis.

## Sources

Primary. These are the game files themselves, which beat any guide:

1. **Retail CD image, v4.1.0.** Internet Archive item
   [`championship-manager-season-0304`](https://archive.org/details/championship-manager-season-0304),
   file `CM0304.iso`. The installer is `CM 03-04.msi` plus `Data1.cab`, a Microsoft cabinet
   compressed with LZX. From the cabinet I extracted the 27 `.tac` files,
   `tactical_templates.xml`, `tactics.xml` (the tactics screen layout) and `cm0304.exe`. The
   executable's FileVersion resource reads `4, 1, 0, 0`. The MSI File table maps the cabinet keys to
   the real file names (`4-4-2 Attacking.tac`, `5-3-2 Sweeper.tac`, ...).
2. **Official patches 4.1.4 and 4.1.5**, in the same Internet Archive item
   (`cm0304patch414.exe`, `cm0304patch415.exe`). The 4.1.4 patch stores its `.tac` files
   uncompressed under `\data\tactics\`, with the previous versions under `\data\tactics\old\`. Both
   patches carry the SI changelog (`\data\changelist.txt`), covering patches 4.1.2 to 4.1.5 and
   Data Editor 1.0.7.
3. **Executables**: `cm0304.exe` 4.1.0 from the CD and the patched exe embedded in 4.1.5. I read
   strings and disassembled a handful of functions with Capstone.

Secondary. These are player guides, used only where the files are silent:

4. thy451, *Championship Manager 03/04 FAQ and Player Guide*, GameFAQs, section C.01, via the
   [Wayback Machine snapshot](http://web.archive.org/web/20110415080320/http://www.gamefaqs.com:80/pc/918869-championship-manager-season-03-04/faqs/30572).
5. cairo140, *Tactical Guide to Championship Manager 03/04*, GameFAQs, section "Configuring Tactics
   in CM", via the
   [Wayback Machine snapshot](http://web.archive.org/web/20120812100900/http://www.gamefaqs.com:80/pc/918869-championship-manager-season-03-04/faqs/32186).

I could not reach the official manual, and champman0102.net had nothing on tactic files. Nothing
below depends on either.

## 1. The shipped preset list

**Verified (CM 03/04).** There are two shipped states:

- **Retail 4.1.0: 27 presets.** The executable loads them by name at startup into a fixed array,
  then checks the count against 27 (`cmp word ptr [esi+0x10], 0x1b`) and raises "Expected tactics
  count and actual count differ." if they disagree. The load order is 4-4-2 Defensive, 4-4-2,
  4-4-2 Attacking, 5-3-2 Defensive, 5-3-2, 5-3-2 Attacking, 4-3-3, 2-3-5, 2-4-4, 2-5-3, 3-2-5,
  3-3-4, 3-4-3, 3-5-2, 4-2-4, 4-5-1, 5-2-3, 5-4-1, 3-4-1-2, 3-4-2-1, 4-3-2-1, 5-3-2 Sweeper,
  4-1-2-1-2, 4-4-2 Diamond, 4-1-3-1-1, 4-1-3-2, 4-2-3-1.
- **Patched 4.1.3 onwards: 29 presets.** These are the 27 plus `4-4-1-1.tac` and `4-2-3-1-dk.tac`.
  The changelog for Patch 2 (4.1.3) reads: "Default and computer team tactics refined, also added a
  couple of new ones 4411 and 4231 ( Danish version )". The patched executables check for 29.
  Patch 4.1.4 ships the 29 files, and patch 4.1.5 ships no tactic files. thy451's list of
  "preset tactics already in the game" matches these 29 exactly, so that guide describes a patched
  install.

**Inherited (CM4).** In retail 4.1.0, 17 of the 27 files have internal names ending in `_CM4`
(`4-4-2-A_CM4`, `4-4-2-VA_CM4`, `5-3-2SW_CM4`, ...), and every file names Paul Collyer as author.
The executable refuses to overwrite them with the message "You cannot write CM4 pre-defined
tactics." CM 03/04 therefore shipped CM4's preset set, and a patch then reworked most of it.

**A retail defect.** In 4.1.0, `4-4-2.tac`, `4-4-2 Defensive.tac` and `4-4-2 Diamond.tac` are
byte-identical apart from the name string. All three are a flat four with runs. The 4.1.3 refresh
gave the Diamond a real diamond: DM C, M R, M L, AM C. Of the 27 files, 24 changed in that patch.
Only 4-2-3-1, 4-2-4 and 4-3-2-1 kept their retail bytes.

### How to read the tables

Each player's slot is stored as a cell code, decoded in section 2. Columns run L, LC, C, RC, R.
`ST` is my label for the top row; the game's own short strings for it are `F` (forward) and `S`
(striker). `A → B` means the player's base cell is A and his run target is B (section 5). The
goalkeeper is always slot 1 in cell GK and is left out of the tables. The column labelled R is the
one whose pitch coordinates lie on the high side of the width axis. Files always list that column
before L, which fits CM's usual DR-before-DL order, but the handedness itself is **unverified**.

### Final state, patch 4.1.3 onwards (29 presets): verified (CM 03/04)

| Preset file | Internal name | Outfield cells in file order (base → run target) |
|---|---|---|
| `4-4-2.tac` | `4-4-2` | D R, D L, D RC, D LC, M R → AM R, M L → AM L, M RC, M LC, ST RC, ST LC |
| `4-4-2 Attacking.tac` | `4-4-2 Attacking` | D R, D L, D RC, D LC, M R → ST R, M L → ST L, M RC, M LC, ST RC, ST LC |
| `4-4-2 Defensive.tac` | `4-4-2 Defensive` | D R, D L, D RC, D LC, M R, M L, M RC, M LC → DM C, ST RC, ST LC |
| `4-4-2 Diamond.tac` | `4-4-2 Diamond` | D R, D L, D RC, D LC, M R, M L, DM C, AM C, ST RC → ST R, ST LC → ST L |
| `4-4-1-1.tac` | `Untitled` | D R, D L, D RC, D LC, M R → AM R, M L → AM L, M RC, M LC, AM C, ST C |
| `4-5-1.tac` | `4-5-1` | D R, D L, D RC, D LC, M R → AM R, M L → AM L, M RC, M C → AM C, M LC, ST C |
| `4-3-3.tac` | `4-3-3` | D R, D L, D RC, D LC, M RC → M R, M C, M LC → M L, ST RC → ST R, ST C, ST LC → ST L |
| `4-3-2-1.tac` | `4-3-2-1_CM4` | D R, D L, D RC, D LC, M R, M L, M C, AM RC, AM LC, ST C |
| `4-2-4.tac` | `4-2-4_CM4` | D R, D L, D RC, D LC, M RC, M LC, ST R, ST L, ST RC, ST LC |
| `4-2-3-1.tac` | `4-2-3-1` | D R, D L, D RC, D LC, M LC → DM LC, M RC → DM RC, AM LC → AM L, AM C, AM RC → AM R, ST C |
| `4-2-3-1-dk.tac` | `4-2-3-1-dk` | D R, D L, D RC, D LC, M LC, M RC, AM L, AM C, AM R, ST C |
| `4-1-3-2.tac` | `4-1-3-2` | D R, D L, D RC, D LC, DM C, M C, M RC → M R, M LC → M L, ST LC → ST L, ST RC → ST R |
| `4-1-3-1-1.tac` | `4-1-3-1-1` | D R, D L, D RC, D LC, M R, DM C, M C, AM C, ST C, M L |
| `4-1-2-1-2.tac` | `4-1-2-1-2` | D R, D L, D RC, D LC, DM C, M RC → M R, M LC → M L, AM C, ST RC → ST R, ST LC → ST L |
| `3-5-2.tac` | `3-5-2` | D RC → D R, D C, D LC → D L, M R, M L, M RC, M C, M LC, ST RC, ST LC |
| `3-4-3.tac` | `3-4-3` | D RC → D R, D C, D LC → D L, M R, M L, M RC, M LC, ST RC → ST R, ST C, ST LC → ST L |
| `3-4-2-1.tac` | `3-4-2-1` | D RC → D R, D C, D LC → D L, M R, M L, M RC, M LC, AM RC, AM LC, ST C |
| `3-4-1-2.tac` | `3-4-1-2` | D RC → D R, D C, D LC → D L, M R, M L, M RC, M LC, AM C, ST RC → ST R, ST LC → ST L |
| `3-3-4.tac` | `3-3-4` | D RC → D R, D C, D LC → D L, M RC → M R, M C, M LC → M L, ST R, ST L, ST RC, ST LC |
| `3-2-5.tac` | `3-2-5` | D RC → D R, D C, D LC → D L, M RC, M LC, ST R → M R, ST L → M L, ST RC, ST C, ST LC |
| `5-4-1.tac` | `5-4-1` | D R → DM R, D L → DM L, D RC, D C, D LC, M R → AM R, M L → AM L, M RC, M LC, ST C |
| `5-3-2.tac` | `5-3-2` | D RC → D R, D C, D LC → D L, DM R → M R, DM L → M L, M RC, M C, M LC, ST RC → ST R, ST LC → ST L |
| `5-3-2 Attacking.tac` | `5-3-2 Attacking` | D RC → D R, D C, D LC → D L, DM R → AM R, DM L → AM L, M RC, AM C, M LC, ST RC → ST R, ST LC → ST L |
| `5-3-2 Defensive.tac` | `5-3-2 Defensive` | D RC, D C, D LC, DM R → D R, DM L → D L, M RC, M C → DM C, M LC, ST RC → ST R, ST LC → ST L |
| `5-3-2 Sweeper.tac` | `5-3-2 Sweeper` | SW C → D C, D RC → D R, D LC → D L, DM R → M R, DM L → M L, M RC, M C, M LC, ST RC → ST R, ST LC → ST L |
| `5-2-3.tac` | `5-2-3` | D RC → D R, D C, D LC → D L, DM R → M R, DM L → M L, M RC, M LC, ST RC → ST R, ST C, ST LC → ST L |
| `2-5-3.tac` | `2-5-3` | D RC → D R, D LC → D L, M R, M L, M RC, M C → DM C, M LC, ST RC → ST R, ST C, ST LC → ST L |
| `2-4-4.tac` | `2-4-4` | D RC → D R, D LC → D L, M R → DM R, M L → DM L, M RC, M LC, ST R, ST L, ST RC, ST LC |
| `2-3-5.tac` | `2-3-5` | D RC → D R, D LC → D L, M RC → M R, M C → DM C, M LC → M L, ST R → AM R, ST L → AM L, ST RC, ST C, ST LC |

### Retail 4.1.0 (27 presets): verified (CM 03/04), files inherited (CM4)

| Preset file | Internal name | Outfield cells in file order (base → run target) |
|---|---|---|
| `4-4-2.tac` | `4-4-2-A_CM4` | D R, D L, D RC, D LC, M R → AM R, M L → AM L, M RC → AM C, M LC → DM C, ST RC, ST LC |
| `4-4-2 Attacking.tac` | `4-4-2-VA_CM4` | D R, D L, D RC, D LC, M R → ST R, M L → ST L, M RC → AM C, M LC → DM C, ST RC, ST LC |
| `4-4-2 Defensive.tac` | `4-4-2_CM4` | D R, D L, D RC, D LC, M R → AM R, M L → AM L, M RC → AM C, M LC → DM C, ST RC, ST LC |
| `4-4-2 Diamond.tac` | `4-4-2 Diamond` | D R, D L, D RC, D LC, M R → AM R, M L → AM L, M RC → AM C, M LC → DM C, ST RC, ST LC |
| `4-5-1.tac` | `4-5-1_CM4` | D R, D L, D RC, D LC, M R → AM R, M L → AM L, M RC → DM RC, M C → AM C, M LC → DM LC, ST C |
| `4-3-3.tac` | `4-3-3_CM4` | D R, D L, D RC, D LC, M RC, M C, M LC, ST RC → ST R, ST C, ST LC → ST L |
| `4-3-2-1.tac` | `4-3-2-1_CM4` | D R, D L, D RC, D LC, M R, M L, M C, AM RC, AM LC, ST C |
| `4-2-4.tac` | `4-2-4_CM4` | D R, D L, D RC, D LC, M RC, M LC, ST R, ST L, ST RC, ST LC |
| `4-2-3-1.tac` | `4-2-3-1` | D R, D L, D RC, D LC, M LC → DM LC, M RC → DM RC, AM LC → AM L, AM C, AM RC → AM R, ST C |
| `4-1-3-2.tac` | `4-1-3-2` | D R → M R, D L → M L, D RC, D LC, DM C, M C → AM C, M RC → ST R, M LC → ST L, ST LC, ST RC |
| `4-1-3-1-1.tac` | `4-1-3-1-1` | D R → M R, D L → M L, D RC, D LC, M R → AM R, DM C, M C, AM C, ST C, M L → AM L |
| `4-1-2-1-2.tac` | `4-1-2-1-2_CM4` | D R, D L, D RC, D LC, DM C, M RC, M LC, AM C, ST RC → ST R, ST LC → ST L |
| `3-5-2.tac` | `3-5-2` | D RC, D C, D LC, M R → AM R, M L → AM L, M RC → DM RC, M C → AM C, M LC → DM LC, ST RC, ST LC |
| `3-4-3.tac` | `3-4-3` | D RC, D C, D LC, M R → DM R, M L → DM L, M RC → AM C, M LC, ST RC → ST R, ST C, ST LC → ST L |
| `3-4-2-1.tac` | `3-4-2-1_CM4` | D RC, D C, D LC, M R, M L, M RC, M LC, AM RC, AM LC, ST C |
| `3-4-1-2.tac` | `3-4-1-2_CM4` | D RC, D C, D LC, M R, M L, M RC, M LC, AM C, ST RC, ST LC |
| `3-3-4.tac` | `3-3-4_CM4` | D RC, D C, D LC, M RC, M C, M LC, ST R, ST L, ST RC, ST LC |
| `3-2-5.tac` | `3-2-5_CM4` | D RC, D C, D LC, M RC, M LC, ST R → M R, ST L → M L, ST RC, ST C, ST LC |
| `5-4-1.tac` | `5-4-1_CM4` | D R, D L, D RC, D C, D LC, M R, M L, M RC, M LC, ST C |
| `5-3-2.tac` | `5-3-2` | D RC, D C, D LC, DM R → M R, DM L → M L, M RC → AM RC, M C → AM C, M LC → AM LC, ST RC, ST LC |
| `5-3-2 Attacking.tac` | `5-3-2 Attacking` | D RC, D C, D LC, DM R → AM R, DM L → AM L, M RC, AM C, M LC, ST RC, ST LC |
| `5-3-2 Defensive.tac` | `5-3-2 Defensive` | D RC, D C, D LC, DM R → D R, DM L → D L, M RC → AM RC, M C → DM C, M LC → AM LC, ST RC, ST LC |
| `5-3-2 Sweeper.tac` | `5-3-2SW_CM4` | SW C → D C, D RC, D LC, DM R → M R, DM L → M L, M RC, M C → AM C, M LC, ST RC, ST LC |
| `5-2-3.tac` | `5-2-3` | D RC, D C, D LC, DM R → AM R, DM L → AM L, M RC, M LC, ST RC → ST R, ST C, ST LC → ST L |
| `2-5-3.tac` | `2-5-3_CM4` | D RC, D LC, M R, M L, M RC, M C → DM C, M LC, ST RC, ST C, ST LC |
| `2-4-4.tac` | `2-4-4_CM4` | D RC, D LC, M R → DM R, M L → DM L, M RC, M LC, ST R, ST L, ST RC, ST LC |
| `2-3-5.tac` | `2-3-5_CM4` | D RC, D LC, M RC, M C → DM C, M LC, ST R → AM R, ST L → AM L, ST RC, ST C, ST LC |

### The requirements hypothesis, checked

| Hypothesis claim | Finding |
|---|---|
| 4-4-2, 4-4-2 Diamond, 4-4-2 Attacking, 4-3-3, 4-5-1, 4-2-3-1, 3-4-3, 5-3-2, 4-1-2-1-2, 4-2-4 shipped | **Confirmed.** All ten are shipped files. |
| 3-5-2 Attacking, 3-5-2 Defensive | **Wrong.** No such presets exist. The game has a single 3-5-2, and ships **5-3-2** Attacking and **5-3-2** Defensive. The two conflicting definitions in the hypothesis look like a conflation with those. |
| 5-4-1 (Sweeper) | **Wrong.** 5-4-1 has no sweeper. The only preset with a sweeper is **5-3-2 Sweeper** (SW C → D C). |
| 2-5-3 as a shipped default | **Confirmed.** It shipped in both 4.1.0 and 4.1.3+, as did 2-4-4, 2-3-5, 3-2-5 and 3-3-4. |
| 4-3-3 as three flat MCs plus three STs | **Confirmed in cell terms.** The base cells are M RC, M C, M LC and ST RC, ST C, ST LC, with no wide midfield cell. In 4.1.3+ the outer two midfielders run to M R and M L, and the outer two strikers run to ST R and ST L. |
| Missing from the hypothesis | 4-4-2 Defensive, 4-4-1-1, 4-3-2-1, 4-2-3-1-dk, 4-1-3-2, 4-1-3-1-1, 3-4-2-1, 3-4-1-2, 3-3-4, 3-2-5, 5-3-2 Attacking/Defensive/Sweeper, 5-2-3, 2-4-4, 2-3-5. |

## 2. The slot grid

**Verified (CM 03/04).** Each player's cell is a 16-bit code: a single row bit in bits 0-6, and a
single column bit in bits 7-11.

| Row bit | Row | Game abbreviation |
|---|---|---|
| 0x01 | Goalkeeper | GK (no column bit) |
| 0x02 | Sweeper | SW |
| 0x04 | Defender | D |
| 0x08 | Defensive midfielder | DM |
| 0x10 | Midfielder | M |
| 0x20 | Attacking midfielder | AM |
| 0x40 | Forward / striker | F, S |

That makes five columns (L, LC, C, RC, R) across six outfield rows, plus GK: at most 31 cells.
Across all 56 preset files (27 retail, 29 patched), 27 distinct cells occur: GK, SW C, and every
column of D, DM, M, AM and ST.

- **There is no wing-back row.** Wing backs are expressed as `D R` / `D L` or `DM R` / `DM L`
  (5-3-2 and 5-2-3 use `DM R → M R`, for instance). "Wing Back" does exist as a position string in
  the executable, which points at the player database rather than the tactics grid. See the leads
  at the end.
- **Three central columns.** A back three is `D RC, D C, D LC`, and a back four is
  `D R, D RC, D LC, D L`. The grid always distinguishes LC, C and RC, even though CM's display
  labels (DC, MC, ...) usually merge them.
- **thy451's grid diagram** shows rows G, S, D, M, A, F with five columns and **omits the DM row**.
  The files use DM throughout, so the diagram is simplified. This is a secondary source contradicted
  by primary evidence.
- **Unverified:** whether the UI lets a player be dropped on every one of the 31 cells (SW L, for
  example), or only snaps to them. The presets only ever put SW in column C.

## 3. What a `.tac` file holds

**Verified (CM 03/04)** for the shipped files, all of which share one layout. It is little-endian
and about 900 bytes long:

1. **Magic and version.** One byte, `\0`, then UTF-16LE `.tac`, then a version word `0x000A`.
2. **Name.** A u32 character count, then UTF-16LE text, then a 2-byte terminator.
3. **Author.** Same encoding as the name ("Paul Collyer" in every shipped file).
4. **Team block, 9 bytes.** The middle four bytes differ between presets (three distinct values
   across the set). This fits packed team instructions, but the field meanings are **unverified**.
5. **11 player blocks of 74 bytes each**, one per slot, in lineup order:
   - 48 bytes: 24 (width, length) byte pairs of pitch coordinates. The first 12 belong to the base
     cell and the last 12 to the run target (section 5). Pitch units run roughly 0-120 on both
     axes, with the goalkeeper at length 0.
   - u16 base cell code, then u16 run-target cell code (section 2).
   - 1 zero byte, then a 6-byte packed block. It differs by role (central defender, full back,
     central midfielder, wide midfielder, forward), which fits per-player instructions, but the
     layout is **unverified**.
   - 2 bytes, `FF FF`, then 8 bytes that differ by role. These fit per-player set-piece
     instructions, but that reading is **unverified**. Then the terminator `FF FF FF`.
6. **Trailer, 12 bytes.** 8 bytes that vary a little between presets, which fits team set-piece
   instructions (**unverified**), then 4 zero bytes.

**Player identities: none.** The format has no person identifiers. A preset stores slots, cells,
runs and instruction data only. Captains and penalty, free-kick, corner and throw-in takers are
chosen by name on the "Set Priorities" panels of `tactics.xml`, and the preset format has nowhere to
store them.

**Unverified:** whether a tactic saved by the user through File → Save carries anything extra, such
as captain or takers. I found no user-saved `.tac` file to compare against. The loader is shared,
which suggests the same layout, but that is inference.

**Verified (CM 03/04):** the tactics screen's File menu offers Load, Save, Save As and Quick Load.
The Quick Load list is empty in `tactics.xml`, so the game fills it at runtime. Presets install to
`data\tactics\`, and a user cannot overwrite a preset ("You cannot write CM4 pre-defined
tactics.").

## 4. Which presets the AI used

- **Verified (CM 03/04):** the presets double as the AI's tactics. The 4.1.3 changelog calls them
  "Default and computer team tactics", and the executable loads the whole set into a fixed array
  and asserts its size. The 4.1.2 changelog also lists "Improved non-human manager tactical decision
  AI", with no detail.
- **Verified (CM 03/04):** staff carry a **Preferred Formation** attribute, shown alongside Playing
  Style, Pressing Style and Playing Mentality. In 4.1.0 its values decode to 15 names, every one of
  them a preset: 1 5-3-2 Sweeper, 2 5-3-2, 3 4-4-2, 4 4-3-3, 5 4-2-4, 6 3-5-2, 7 4-1-2-1-2, 8 4-5-1,
  9 3-4-3, 10 3-4-1-2, 11 3-4-2-1, 12 4-3-2-1, 18 4-2-3-1, 19 4-1-3-1-1, 20 4-1-3-2. Data Editor
  1.0.7 notes "Added some missing tactics to preferences section." I did not decode the patched
  enum.
- **Verified (CM 03/04):** a separate routine names a formation from a digit code (4312 → "4-3-1-2",
  41212 → "4-1-2-1-2", 44201-44203 → "4-4-2", 53201/53203/53205 → "5-3-2"), and scout reports use
  the result ("normally plays a <formation> formation"). It can name 4-3-1-2, which has no preset
  file.
- **Unverified:** that an AI manager picks the preset named by his Preferred Formation, and how the
  Attacking, Defensive, Diamond and Sweeper variants, which are absent from the preference list,
  come into play. The fit is suggestive, but I did not trace the selection code. No guide or
  changelog documents the rule.

## 5. With-ball and without-ball positions

- **Verified (CM 03/04):** every player has exactly **two** cells: a base position and a **run**
  target. The tactics screen definition names this a *run*: its pitch widget has "normal run
  colour", "darkened run colour" and "drag run colour". The guides describe how it is set:
  "right click to encourage a run in any particular direction" (cairo140) and "Right click on the
  player and drag ... to create the arrow" (thy451). Players call it an **arrow**. The game uses no
  "with ball" or "without ball" wording anywhere in its strings; "Off The Ball" is a player
  attribute.
- **Verified (CM 03/04):** each cell has a 12-point coordinate table in the file. When a preset
  changes only a run target (4-4-2-A against 4-4-2-VA in retail), only the second table changes.
- **Unverified:** what the 12 points are indexed by. Each table varies along a 3 × 4 pattern (three
  width values by four length values). That fits positions keyed to a ball zone, but I have not
  confirmed it.
- **Later FM, unverified:** separate "with ball" and "without ball" positions as named UI concepts.
  I found no trace of them in CM 03/04. Treat the base-cell-plus-run model as the CM 03/04 truth.

## Leads for sibling tickets

Not researched, only noted.

- **[Ticket 03](../../.scratch/formations-and-instructions/issues/03-cm-0304-team-and-player-instructions.md),
  team and player instructions.** `data\tactics\tactical_templates.xml` (retail) defines seven
  player-instruction templates: Goalkeeper, Central Defender, Full Back, Defensive Midfielder,
  Attacking Midfielder, Winger and Striker. Its header comments enumerate every field: pass (mixed,
  short, direct, long); closing down (stand off, own half, always); tackling (easy, normal, hard);
  marking (zonal, man); mentality (ultra defensive, defensive, normal, attacking, gung ho);
  distribution (long kick, ask defenders to come collect); cross from (deep, touchline); cross aim
  (near post, centre, far post, man); and booleans for cross ball, long shots, forward runs, run
  with ball, try through balls, free role and hold up ball. `tactics.xml` has panels for Player
  Instructions, Player Set Piece Instructions, Team Instructions and Team Set Piece Instructions,
  and its Set Priorities panels hold Captains, Penalty Takers, Free Kick Takers L/R, Corner Takers
  L/R and Throw In Takers L/R. The 4.1.3 changelog fixes captain replacement in matches.
- **[player-positional-model ticket 01](../../.scratch/player-positional-model/issues/01-cm-0304-editor-positional-fields.md),
  editor positional fields.** The executable has person-position strings "Wing Back", "Full Back"
  and "Winger" ("person compare ... position string"). The tactics grid has none of these as rows,
  so they are probably player-database positions. Data Editor 1.0.7 requires patch 4.1.4.

## Reproducing

This needs no tools beyond Python and macOS `tar` (libarchive). Carve folder 98 (the tactics) and
folder 0 (the exe) out of `Data1.cab` into single-folder cabinets. libarchive fails on an earlier
folder of the full cabinet, which is why the carving is needed. Then extract with `tar -xf`. Each
patch is a zip wrapping an exe, and its `.tac` files can be sliced out at the UTF-16 `.tac` magic.
I did not copy any game file into this repo.
