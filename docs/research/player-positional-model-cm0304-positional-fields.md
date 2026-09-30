# What the CM 03/04 database stores about a player's positions

**Question:** How does Championship Manager 03/04 represent where a player can play: storage,
line and side sets, Free Role, slot suitability, compact labels, and the match-engine consequence
of playing out of position? Asked by
[ticket 01](../../.scratch/player-positional-model/issues/01-cm-0304-editor-positional-fields.md)
of the player-positional-model effort. This file settles facts only and decides nothing for this
codebase.

**Labels.** Every claim carries one of:

- **Verified for CM 03/04**: read in source code that parses the CM 03/04 (or CM4, same format)
  data files, or seen in CM 03/04 play material.
- **Inherited from CM 01/02**: shown for CM 01/02 only and assumed unchanged.
- **Later Football Manager**: FM behaviour, not CM.
- **Unverified**: no source found.

## Sources

Ordered by weight.

1. **CM 4 Pregame Editor v0.10 source** (Michael Nygreen, Delphi, GPLv2).
   [sourceforge.net/projects/cmeditors](https://sourceforge.net/projects/cmeditors/) (release
   `CM4Pregame-v0.10-source.zip` and the project CVS). Its readme says it "can edit all parts of
   the pregame data for Championship Manager 4 & 03/04" and names the CM 03/04 `data\db` files.
   Relevant files: `Database/CM4DataTypes.pas` (class `TCM4PlayingData`, its `Load`, and the
   formation constants) and `framePeopleUnit.dfm` (the editor's position and side spin edits).
   This is the nearest thing to primary evidence available. SI never published the CM 03/04 header
   files, as a 2024 forum thread confirms
   ([champman0102.co.uk t=6259](https://champman0102.co.uk/viewtopic.php?t=6259)).
2. **CM Scout 3.10 source** (same author, same SourceForge CVS, module `CMScout`). Built "for
   Championship Manager 4 and 03/04". `Database/CM4SaveGameData.pas` holds `TCM4PlayingData.GetPosition` and
   `GetLongPosition`, the tool's reconstruction of the in-game position label, with
   `POSITION_THRESHOLD = 15`.
3. **CM 03/04 GameFAQs guides** from 2003–04: the Young Player Guide by mwaze
   ([faqs/28326](https://gamefaqs.gamespot.com/pc/918869-championship-manager-season-03-04/faqs/28326)),
   the Golden Oldies Guide by mwaze
   ([faqs/28438](https://gamefaqs.gamespot.com/pc/918869-championship-manager-season-03-04/faqs/28438)),
   and the FAQ/Strategy Guide by thy451
   ([faqs/30572](https://gamefaqs.gamespot.com/pc/918869-championship-manager-season-03-04/faqs/30572)).
   The first two transcribe 224 CM 03/04 position labels. The third tabulates editor values
   (L, C, R, WB, FR and the line ratings) for several hundred players.
4. **CM 01/02 tooling** used for comparison:
   - nckstwrt `CM0102Patcher`, `SaveChanger/Structures.cs`
     ([5481361](https://github.com/nckstwrt/CM0102Patcher/blob/5481361dd32dad23d0e1d2ecddeeeaa0baaecf83/SaveChanger/Structures.cs)).
   - CM Scout Intrinsic (vfilatov, maintained by MadScientist of the CM 01/02 patch team),
     `Sources/Model/DataService.cs` and `Sources/View/Converters.cs`
     ([8ca6e39](https://github.com/MScientistCM/CMScoutIntrinsicCommunity/blob/8ca6e39d4a3b9cbe0ecb3ec50cdc7d914444ae3f/Sources/Model/DataService.cs)).
   - ChrisReganXP `CMScouterCore`, `CMScouter.UI/Raters/DefaultRater.cs`
     ([83a4714](https://github.com/ChrisReganXP/CMScouterCore/blob/83a4714024135a44c2abce06c2185a0e0458bc3d/CMScouter.UI/Raters/DefaultRater.cs)).
5. **CM 01/02 reverse-engineering on champman0102.co.uk.** MadScientist, "FAQ: Positional
   Penalty", 2021 ([t=2321](https://champman0102.co.uk/viewtopic.php?t=2321), pages 1–3). Also
   "Feedback Request: How should player positions be displayed?", 2021
   ([t=3004](https://champman0102.co.uk/viewtopic.php?t=3004)), "Freeroles and how to use them"
   ([t=2773](https://champman0102.co.uk/viewtopic.php?t=2773)), and "Questions about player
   positions", 2026 ([t=10369](https://champman0102.co.uk/viewtopic.php?t=10369)).

The CM 03/04 official manual and the official pre-game editor's help were not found online.

## 1. Line and side storage

- **Independent ratings, not per-cell values.** A player's playing-data record stores nine
  positional bytes followed by three side bytes, then the attributes. In CM 03/04 file order
  they are `Goalkeeper, Sweeper, Defender, DefensiveMidfielder, Midfielder, AttackingMidfielder,
  Attacker, WingBack, FreeRole`, then `RightSide, LeftSide, Central`. No field exists per atomic
  cell such as DR or AML, and no stored "preferred position" or label string exists. The only
  other `Position` field in the data types is a club's league `LastPosition`. **Verified for CM
  03/04** (source 1, `TCM4PlayingData` and its `Load`).
- **Scale: 1–20, with 0 allowed.** Each field is a signed byte (`ShortInt`). The editor's spin
  edits run `MinValue = 0` to `MaxValue = 20` for every line and side. The loader's range check,
  now commented out, tested `0..20`. Real data uses the low end heavily: the thy451 tables are full
  of `1`, `8` and `10` values. **Verified for CM 03/04** (sources 1 and 3).
- **Versatility** is a separate 1–20 attribute in the same record. **Verified for CM 03/04** as a
  stored field (source 1). Its effect is covered in item 7.
- **Ratings change during a career.** CM 03/04 training offers "Retrain Position / Retrain Side"
  schedules. thy451: "Each player have a value with regard to each side and position… Only players
  that start off with a significant amount of points in the position or side … will eventually be
  able to make the change". **Verified for CM 03/04** (source 3, section B.01.4).
- CM 01/02 has the same shape except for field order (see item 8).

## 2. The line set

The editor's captions are `Goalkeeper, Sweeper, Defender, Defensive Midfielder, Midfielder,
Attacking Midfielder, Attacker, Wing Back, Free Role`. **Verified for CM 03/04** (source 1,
`framePeopleUnit.dfm`). There are seven true lines plus Wing Back and Free Role. Wing Back is a
line-like rating with no label code of its own (item 6). Free Role is covered in item 4.

The editor calls the striker line **Attacker**, and one byte serves it. The in-game label splits
that one rating into two codes:

| Editor field | Short label | Long label (CM Scout) |
| --- | --- | --- |
| Goalkeeper | `GK` | Goalkeeper |
| Sweeper | `SW` | Sweeper |
| Defender | `D` | Defender |
| Defensive Midfielder | `DM` | Defensive Midfielder |
| Midfielder | `M` | Midfielder |
| Attacking Midfielder | `AM` | Attacking Midfielder |
| Attacker | `F` or `S` | Forward or Striker |
| Wing Back | none | none |
| Free Role | none | none |

- **`F` versus `S` is derived, not stored.** An attacker (≥ 15) is labelled `F` when Left, Right,
  Free Role or Attacking Midfielder is also ≥ 15, and `S` otherwise. **Verified for CM 03/04** as
  CM Scout's rule (source 2). It is consistent with the transcribed labels: `S C` 37 times, while
  `F` appears with wide sides (`F RLC`, `F LC`, `F RL`) or after `AM` (`AM/F RC`). Plain `F C`
  appears 15 times, which the rule accounts for only through Free Role ≥ 15 (source 3,
  guides 28326/28438). thy451 believed the split was "dependant on what the editor states". The
  editor stores no such field, so that is a display derivation. The identical rule appears in CM
  Scout Intrinsic for CM 01/02 (**inherited from CM 01/02**, same behaviour).
- mwaze's glossary: "F - Forward (can usually play as attacking midfielder to[o])", "S - Striker".
  **Verified for CM 03/04** (source 3).

## 3. The side set

- **Right, Left, Centre**, stored in that order. The editor's captions are `Right Side:`,
  `Left Side:` and `Central:`, under a `Sides:` heading. Label codes are `R`, `L` and `C`.
  **Verified for CM 03/04** (sources 1 and 2).
- **GK and SW use sides differently.** Sweeper takes a side like any line: `SW/D C` and
  `SW/D LC` appear in the CM 03/04 labels (source 3). Goalkeepers appear only as bare `GK`, 21 of
  21 times. thy451's goalkeeper table has empty side columns, so goalkeepers probably carry low or
  zero side values in the data. Whether the label also suppresses the side explicitly is
  **unverified for CM 03/04**. CM Scout (CM4) appends sides unconditionally. CM Scout Intrinsic
  (CM 01/02) suppresses every side when Goalkeeper > 14 (`IsRightSide` and related functions),
  which is **inherited from CM 01/02**.
- When no side reaches the threshold, the label has no side suffix. mwaze wrote this as "D (side
  not set)" (source 3).

## 4. Free Role

Free Role is three distinct things in CM 03/04:

1. **A 1–20 player rating** stored in the positional block, between Wing Back and Right Side. It
   has the same 0–20 editor range as the lines. **Verified for CM 03/04** (source 1). It is hidden
   in game. thy451: "there is a free role attribute. Unfortunately it is hidden" (source 3, player
   instructions section F). thy451 also lists it in the side/wing column group (`F = Free Role`).
2. **A tactical individual instruction**, "Free Role", set per player in the tactics screen:
   "Free role means the player roams around". **Verified for CM 03/04** (source 3).
3. **A coach and manager preference**, the `Free Roles` field of non-playing data, listed with
   Attacking, Directness, Marking and Offside as a coaching attribute. **Verified for CM 03/04** as
   a stored field (sources 1 and 3).

What reads the player rating:

- The label's `F`/`S` split reads it (item 2). **Verified for CM 03/04** through CM Scout's
  reconstruction, which is a strong inference but not engine code.
- The positional penalty reads it. In CM 01/02, an AM = 20 player in the AMC circle is penalised
  "if he isnt 20 for attacker nor 20 for freerole", so Free Role acts as an alternative
  qualification for the AMC slot. Forum users also treat a high Free Role rating as what makes the
  Free Role instruction pay off. **Inherited from CM 01/02** (source 5, t=2321 and t=2773). Not
  verified for CM 03/04.

## 5. Slot suitability

No source documents how the CM 03/04 engine combines a line rating and a side rating into fitness
for one slot. **Unverified for CM 03/04.** What exists:

- **CM 01/02 reverse engineering** (MadScientist, source 5) speaks throughout of per-slot values
  such as "DR=20", "10 for WBR (or DMR)" and "AM(R/L)=20". The engine therefore derives a value per
  circle, and the penalty applies whenever that value is below 20, scaled by Versatility. The
  documented special cases (**inherited from CM 01/02**):
  - The wide DM circles (DMR, DML) read the **Wing Back** rating: "What is the natural position
    for a player with WB=20? Its the wide DM circles". A DMR-rated player is expected to carry an
    arrow toward the centre, or "he may get a huge penalty".
  - An arrow is scored against the rating of the circle it points to. Instructions such as
    "forward runs" do not trigger the penalty.
  - The M circles use `max(M, AM − 5)`.
  - At game initialisation the game raises M to at least half of AM when AM > 14, "even if his M
    value is 1 in the official pre-game editor".
  - The AMC circle wants Attacker 20 or Free Role 20 on top of AM.
  - The label shows DM whenever DM > 14, regardless of a higher M.

  None of these give the line-by-side combining function itself.
- **Community tools use threshold intersection.** CMScouter (CM 01/02) treats a player as able to
  play right back when `DF >= 15 && Right >= 15`, right wing-back when
  `(WingBack >= 15 && Right >= 15) || (DF == 20 && Right == 20)`, and so on. This is a tool
  heuristic, not engine behaviour.
- **`min(line, side)`** remains only a candidate. Nothing found supports or refutes it.

## 6. Compact labels

CM Scout's `GetPosition` (source 2, CM4/CM 03/04) is the most detailed reconstruction found. It
is consistent in form with the 224 CM 03/04 labels in the GameFAQs guides (mwaze writes a missing side as "(side not set)"). **Verified for CM 03/04** as
the tool's rule and as consistent with in-game labels. The rule is not read from game code.

1. **Threshold.** A line or side appears when its rating is **≥ 15** (`POSITION_THRESHOLD = 15`).
   The CM 01/02 tools use `> 14`, the same threshold. A forum post calls 15 the "magic value" used
   by every editor (source 5, t=10369).
2. **Goalkeeper short-circuits.** If GK ≥ 15 the line part is just `GK`, and other lines are
   ignored.
3. **Line order** is defensive to attacking, joined by `/`: `SW`, `D`, `DM`, `M`, `AM`, then `F`
   or `S`.
4. **Suppression rules.** These make the label a lossy view rather than a clean grid:
   - `M` is shown only if DM < 15 **and** AM < 15. This is why a DM 17 / M 20 player shows as DM.
     The CM 01/02 thread confirms that behaviour in game (source 5).
   - `AM` is shown only if DM < 15 **and** (Attacker < 15 **or** M ≥ 15).
   - Wing Back never appears. CM Scout ignores it. No CM 03/04 transcribed label contains `WB`, and
     thy451 lists WB = 20 players with plain `D` labels.
5. **Side suffix.** After one space come the qualifying sides concatenated with no separator, in
   the order **R, L, C**. Examples: `D RC`, `AM RLC`, `F LC`. The long form is
   `Defender/Defensive Midfielder (Right/Centre)`.
6. **Centre** is an ordinary side letter. There is no special casing beyond the R-L-C order.
7. **Ratings that do not form a clean grid** are flattened. The label is a Cartesian shorthand:
   `D/M R` claims nothing about whether the player can play DR and MR specifically. Lines and sides
   are thresholded independently.

Of the ticket's examples:

- `AM/F RC` and `D/DM RC` are real CM 03/04 labels (source 3).
- `D/WB L` was **not found** in any CM 03/04 label. It is **unverified**, and by the evidence
  above the CM label never shows WB. In the 2021 CM 01/02 patch discussion, the patch author asks
  "where should I put the Wingback in the text", implying the stock label omits it
  (source 5, t=3004).

CM 01/02 differs on Wing Back. CM Scout Intrinsic counts WB > 14 as qualifying for `AM`, so a WB
player shows as AM. **Inherited from CM 01/02**, not observed in CM 03/04 (see item 8).

## 7. In-game consequence of playing out of position

- **CM 03/04: undocumented.** No CM 03/04 source found describes the engine's treatment. thy451
  advises only that retraining is slow and it is "better to … seek other players that are
  naturally suited for the position". **Unverified for CM 03/04.**
- **CM 01/02 (inherited)**, from MadScientist of the CM 01/02 patch team, who reads the engine
  code:
  - The penalty applies to **tactical attributes** during a match: "positioning, marking,
    anticipation, off the ball, creativity, and maybe decisions".
  - It applies when a player's circle, or the circle his arrow points to, does not match his
    positions.
  - A lower Versatility gives a larger penalty.
  - A rating of 20 for that circle means no penalty.
  - It checks only the non-"wib-wob" tactics screen.

  Technical and physical attributes are not reported as affected. Users stress that a much better
  player out of position can still beat a weak natural one (source 5, t=2321).
- **FM-style suitability tiers and the in-match "familiarity" labels** (natural, accomplished,
  competent, unconvincing, awkward, ineffectual) are **later Football Manager**. None of them
  appears in any CM 03/04 source read here.

## 8. Differences from CM 01/02 and CM4

- **CM4 and CM 03/04 share one data format.** One editor and one scout tool handle "all versions
  of CM 4 and CM 03/04". Only the data directory differs (`data` versus `data\db`). **Verified for
  CM 03/04** (sources 1 and 2). No positional difference between CM4 and CM 03/04 was found.
- **CM 01/02 against CM 03/04 storage.**
  - Both use the same nine positional ratings and three sides as signed 1–20 bytes.
  - Field order differs. CM 01/02 is `…WingBack, RightSide, LeftSide, Central, FreeRole`. CM 03/04
    is `…WingBack, FreeRole, RightSide, LeftSide, Central`.
  - The attribute sets around the block also differ. For example, CM 03/04 has `Creativity`,
    `OneOnOnes` and `RushingOut`, and CM 01/02 has `Movement`.

  (Source 4 `Structures.cs` against source 1.)
- **Labels.** Both use the ≥ 15 threshold, the same `F`/`S` rule, the DM-hides-M rule and R-L-C
  side order.
  - CM 01/02: WB > 14 counts toward `AM`, and GK suppresses sides (CM Scout Intrinsic).
  - CM 03/04: CM Scout ignores WB entirely and does not suppress GK sides.

  Whether those two differences are real game changes or tool discrepancies is **unverified**.
- **Engine penalty and slot combination.** No CM 03/04 or CM4 evidence exists for either, so
  whether they changed is unknown.

## Leads for sibling tickets

For effort formations-and-instructions, tickets 02 and 03:

- **Formation enum in the CM 03/04 data.** `CM4DataTypes.pas` defines a club or manager
  `PreferredFormation` byte with constants 0–20: not specified, 532 sweeper, 532, 442, 433, 424,
  352, 41212, 451, 343, 3412, 3421, 4321, 352SW, 4312, 541, 4411, 442 sweeper, 4231, 41311, 4132
  (source 1).
- **Shipped preset list.** thy451 section C.01 names the in-game preset tactics: 541, 532
  Sweeper/Defensive/Attacking, 532, 523, 451, 442 Diamond/Defensive/Attacking, 442, 4411, 433,
  4321, 424, 4231dk, 4231, and more. It also sketches a 5-column tactics grid with F, A, M, D and
  S rows over a G cell. That sketch omits a DM row, so treat it as approximate (source 3).
- **Individual instructions** in thy451 section C.02 include Free Role, Try Through Ball and Hold
  Up Ball. Section C.02.3 covers set priorities such as captain and set pieces.
- **Arrows as a second position.** In CM 01/02 an arrow makes the player "change his tactical
  role when your team has the ball", scored against the arrowed-to circle. Wib-wob (the
  with/without-ball screens) rewrites the base screen's circles and arrows (source 5, t=2321).
- **Tactic benchmarking tools** for CM 01/02 (agevak `CM0102` TacticBenchmarker) set every
  positional rating to 20 to neutralise the penalty. This is a useful control technique if
  anyone benchmarks presets.
