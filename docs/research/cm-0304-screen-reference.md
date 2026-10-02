# Research: what CM 03/04 looked like, screen kind by screen kind

Resolves [ticket 01](../../.scratch/cm-restyle/issues/01-cm-0304-reference-catalogue.md) of the
cm-restyle effort. It records how Championship Manager 03/04 drew each kind of screen and decides
nothing about this codebase. Screenshots the human supplies take precedence over it (map decision 9).

## Labels

- **Files**: read directly from the retail game's layout and skin files (see source F). These are
  exact, and every hex value marked this way is converted from the file's RGB triple.
- **Shot**: seen in a screenshot of the shipped game (sources M and G). Hex values marked
  "≈" were sampled from lossy thumbnails, so treat them as ±8 per channel.
- **Pre-release**: a screenshot from a beta build (version strings `4.1b0002`, `4.1b0016`,
  `4.1b0017`). The look matches retail, but treat details as provisional.
- **Inferred**: my reading of the evidence, with no source stating it outright.
- **CM4**: material shipped in 03/04 but marked as CM4's. Nothing below comes from CM4 or CM 01/02
  screenshots, since none were needed. FM is out of scope throughout.

## Sources

- **F. The game's own files.** Internet Archive item
  [`championship-manager-season-0304`](https://archive.org/details/championship-manager-season-0304),
  `CM0304.iso`, cabinet `Data1.cab` (retail 4.1.0). It ships about 150 layout files
  (`squad.xml`, `player_profile.xml`, `news.xml`, `match.xml`, ...), the skin property files
  (`settings.xml`, `ter.xml`, `retro.xml`, `alternative.xml`), about 1,900 PNG interface pieces and
  311 photo backdrops at 1280×960. The same extraction backs
  [the formations research](formations-and-instructions-cm0304-formations-and-tactic-files.md).
- **M. MobyGames screenshots**, 44 captures of retail 4.1.4 with the Ter 03-04 skin:
  [gallery](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/)
  ([Wayback copy](http://web.archive.org/web/20241222013428/https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/)).
  Individual shots are cited as `M/<id>`, which resolves to
  `https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/<id>/`.
  The main menu is also available at full 1024×768
  ([PNG](https://cdn.mobygames.com/screenshots/16626362-championship-manager-season-0304-windows-main-menu.png)),
  which is where the exact-pixel samples come from.
- **G. Gamepressure (gry-online) gallery**, five pre-release captures:
  [page](https://www.gamepressure.com/games/championship-manager-season-0304/zdbd7). Cited as `G/<n>`,
  which resolves to `https://cdn.gracza.pl/galeria/galeria_duze3/<n>.jpg`.
- **W. Worthplaying press release**, 7 Nov 2003:
  [article](https://worthplaying.com/article/2003/11/7/news/13658-championship-manager-season-0304-screens/).
  The images no longer load, but one press shot's file name is `ter_liverpool_training.jpg`.

The official manual and champman0304.net were not consulted. Nothing below depends on either.

## Cross-screen visual vocabulary

The default skin is **Ter 03-04**, by Craig Hunter, described in its own file as "the alternative
look for CM4, updated for 03-04" (Files: `ter.xml`). The executable's skin-loading strings read
`skins`, `ter`, `settings` (Files: `cm0304.exe`), the Preferences screen shows it selected
(Shot: [M/216132](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216132/)),
and the press shots were named after it (W). That makes Ter the default (**Inferred**, but strongly
supported). Every screenshot below uses it.

**Frame.** Every in-game screen has the same frame
(Shot: [M/216131](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216131/), [M/216136](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216136/)):

| Region | What it is |
| --- | --- |
| Left sidebar (~88px) | Slate-blue column (≈`#405477`). Top: game date and time in small yellow. Then a pair of yellow ◀ ▶ arrows (back/forward screen history) in rounded tiles. Then stacked rounded slate buttons with centred two-line white labels: *Continue Game*, the manager's name, *Competitions*, *Nations & Clubs*, *Screen History*, *Game Options*. The active or primary one has yellow text (`#ffff33`). Version string (`4.1.4`) at the bottom in yellow. During a match the date block becomes the period ("Second Half") and a large minute number, and *Continue Game* becomes *Pause* / *Play*. |
| Title bar (top) | Full-width rounded bar. On club, person and competition screens it is **painted in the club's colours**: Charlton red with white text, Newcastle black with white, River Plate white with red, Parma navy with yellow (Shot: M/219937, G/1873887265, G/1873887203, M/216136). Without a club context it is navy `#1c346d` with cyan-blue `#009edf` text (exact, main menu). Large bold title, smaller subtitle under it ("12th in Italian Serie A", "Defender (Right/Centre), Italian (3 caps), Age 22"). A faint SI "S" logo watermark sits at the right end. |
| Tab strip | Directly under the title: a full-width row of joined blue pill tabs (≈`#38588c`), white bold small text. The selected tab gets a lighter fill and a thin yellow or white outline, with yellow text on some screens (Shot: G/1873887234). Club screens carry a second tab strip at the bottom of the content: *Tactics, Training, Last Match, (league), History* (Shot: M/216136). |
| Content | The photo backdrop, darkened, with panels drawn directly on it (see *Panels*). |
| Bottom bar | Thin blue bar (`#28436e`, exact) holding a scrolling news ticker, items separated by `+++` in light blue (`#60c0ff`), plus right-aligned action buttons (*Actions ▼*, *Cancel*, *Confirm*, *Options ▼*, *Exit Replay*). |

**Backdrop.** One of 311 full-colour 1280×960 football photos: stadiums, training grounds,
dressing rooms, the boardroom, physio rooms, fans (Files). The default backdrop is an AFC Wimbledon
player celebrating in front of a sponsor board (Files: `default.jpg`). Ter darkens the photo with
black at 70% opacity (`bgcl` black, `bgop` 0.7, Files: `ter.xml`), so a panel area samples
around `#353535` (exact, main menu). The darkening is a skin-wide wash, not a per-panel fill.
Preferences offers *Enable Background Changes* (Files: `preferences.xml`). Whether the game picks
photos by screen (boardroom for board screens, for example) is **unverified**.

**Panels.** A named box (`tbox` / `lbox` in the layout files) is a thin 1px light-grey outline
(≈`#585554` against the dark wash) with a slightly darker translucent fill, and a **bold yellow
title** at top left: `#ffff33` in Ter (`selc`). Collapsible boxes (`lbox`) have a small ▼ / ▲ or
+/− toggle at the top right (Shot: G/1873887203 *Income*, *Expenditure*; M/219960). The main menu's
panel title sits centred in the top border line (Shot: M/216131).

**Buttons** (Files: layout `kind` names; Shot: all):

- `pbtn`, a pop-up menu button: blue rounded pill, white text, then "▼" (*View ▼*, *Sort ▼*,
  *Search ▼*, *Filter ▼*, *Actions ▼*, *Make Board Request ▼*). Opens a dark list menu with the
  hovered item in yellow (`mnsc` `#ffff33`) and submenus marked ▶ (Shot: M/219924).
- `abtn`, an action button: the same blue pill without the arrow (*Select All*, *Mark As Unread*,
  *Past Meetings*, *OK*). It is disabled when its text dims to grey (`dscl` `#a0a0a0`).
- `obtn`, an option button: the wide rectangular button of the main menu (`#3c659d`, exact,
  vertical gradient).
- `cbox`: a small square blue checkbox with a white tick, label on the right (*Show Filters*,
  *Show effects of training*), usually top right of the content.
- Dropdown fields in forms: a wide slate-blue rounded field, value left-aligned, "▼" at the right
  (Shot: M/216132, M/216143).

Interface pieces in the files bear this out: rounded navy (`#122c69`) tab and button caps with
a yellow-outlined variant for the selected state, blue gradient bars (`#476ea5`→`#3b609c`), and
glossy orange and yellow arrow glyphs (Files: PNG assets).

**Tables.**

- **Column headings**: a blue rounded band (≈`#305888`) across the table, small bold white text,
  centred, with thin darker vertical separators. The sort column shows "▼" (Shot: M/219961 *Fee ▼*).
- **Rows**: bold white text on the dark wash, about 13px per row at 1024×768. Name columns are
  left-aligned, numbers centred or right-aligned.
- **Striping** is opt-in per table (`stripe_rows` in the table's `mode`, Files). Where it's on, every
  other row is a slightly lighter translucent band (≈`#2c2c2c` against `#242424`, Shot: M/219961).
  Striped: news inbox, fixtures, transfers, player history and form, match stats, training
  players, file lists, the squad's *Traditional* view. Not striped: the default squad view, player
  search results, player profile attribute tables (Files).
- **Selection** (`select_rows`): the selected row is a solid lighter blue-grey band. The highlight
  colour is `hilc` `#4071a7` in Ter (`#8080b4` in the base `settings.xml`). Multi-select tables
  add a bullet column (`show_bullets`) (Files; Shot: M/216140).
- **Your own club or players** use the selection colour, yellow `#ffff33`, wherever they appear in
  a list (*Charlton* in transfers and in a league table, Shot: M/219961, M/219951).
- **Scroll bars**: a narrow blue track with ▲ ▼ blue buttons at the ends.

**Colour roles that recur** (Files, exact):

| Role | Hex | Where |
| --- | --- | --- |
| Panel title, own club/player, menu hover, selected tab text | `#ffff33` | `ter.xml` `selc`, `mnsc` |
| Body text, labels | `#ffffff` | `ter.xml` `txcl` |
| Value text, normal (attributes, money, competition names) | `#ffd000` | profile, finances, fixtures, news date |
| Value text, emphasised (attribute ≥ 15, alternate money columns) | `#fff000` / `#ffff00` | profile `cteb` etc., finances |
| Special value (morale, foot, condition, avg rating, tactics style) | `#ff6400` / `#ff7000` | profile `catv`, stats `cavr` |
| Extra info / goals / man of the match / progress bars | `#32d0ff` | profile `cext`, match `goac`, `momc` |
| Disabled / unused / muted | `#a0a0a0`, `#969696`, `#b4b4b4`, `#c8c8c8` | `dscl`, subs, missed pens |
| Red card | `#c80000` | match `redc` |
| Row highlight | `#4071a7` | `ter.xml` `hilc` |

**Tooltips.** Yellow box, small black text (`hncl` black, Files: `ter.xml`; Shot: M/216143
"Tick to exclude injured players").

**Busy state.** While the game processes, the whole screen dims and the sidebar reads
*Processing* (Shot: M/219958).

**Fonts.** Ter uses font 5 for all roles, with titles at 22/18/12 and buttons at 7/9/10
(Files: `ter.xml`). The font identity behind the number is **unverified**. It renders as a bold
humanist sans (Tahoma- or Verdana-like). Three `.ttf` files ship (Files), but which number maps to
which file was not established.

**Calibration against the restyled Tactics screen.** The Tactics brief's panel yellow (~`#ffd23f`)
sits between the two yellows the game uses. Panel **titles** are `#ffff33`, and **values** are
`#ffd000`/`#fff000`. The "blue column-heading band", "glossy blue pill buttons with ▼" and "yellow
hint text" all match the files and screenshots.

## Dense player lists: squad

Shot: [M/216135](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216135/), [M/216136](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216136/). Files: `squad.xml`.

- **Structure.** Title bar is the club name with its league position as subtitle. The top tab strip
  reads *Squad · Staff · Information · Finances · Fixtures · Transfers*. Then a row of pop-up
  buttons on the left (*View ▼*, *Sort ▼*, *Team ▼*) and *Show Filters* on the right. One `tbox`
  titled *Players (Contract View)* holds the table, where the view name goes in brackets. A *Positions*
  strip sits below it, then the bottom tab strip.
- **Two layouts.**
  - The default ("Players (Position(s))") is a **two-column** list: two
    independent player columns side by side, each row a pick chip, a status badge, the name and the
    position, with no column headings (Shot: M/216135).
  - The other views (Contract, ...) are one wide table with a heading band: *Pkd · Inf · Name · Squad
    Status · Basic Wage · Contract · Offer Options · Asking Price* (Shot: M/216136).
  - The *Traditional* view is the striped one (Files: `sqlt` has `stripe_rows`, `sqls` does not).
- **Pick column.** A pale-blue empty rounded chip (≈`#7094bc`) for an unpicked player. A picked
  player's chip turns green (≈`#247854`) and shows his slot (`GK`, or a shirt number on Tactics).
- **Inf column.** Small round badges: orange with a short code for status (unhappy, injured, and
  so on), green `Wnt`, teal `Loa`, `Lst` (Shot). The full badge legend is **unverified**.
- **Positions strip.** A row of small blue rounded chips (`GK DR DL DC DC MR ML MC MC FC FC SB1 …
  SB12`), with filled slots in green.
- **Name colours** (Files: `squad.xml`, exact):

  | Status | Hex |
  | --- | --- |
  | normal | white |
  | shortlisted | selection yellow `#ffff33` |
  | virtual player | `#c8c8c8` |
  | on loan **to** another club | `#66ccff` |
  | on loan **from** another club | `#336699` |
  | co-owned, at this club | `#996600` |
  | co-owned, not at this club | `#ff9900` |
  | on trial here | `#66ff00` |
  | on trial elsewhere | `#336633` |

  A trailing `*` marks a player with a note (Shot: *Adriano\**, *Nakata, H\**). Adriano renders orange
  in M/216136, and he was co-owned with Inter, which fits.

## Player search and other search screens

Shot: [G/1873887234](https://cdn.gracza.pl/galeria/galeria_duze3/1873887234.jpg) (pre-release), [M/216142](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216142/), [M/216143](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216143/), [M/216144](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216144/), [M/219924](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219924/). Files: `person_search.xml`, `person_search_panel.xml`.

- **Structure.** Title *Player & Staff Search*, and the tab strip reads *Shortlist · Player Search · Staff
  Search · Scout For Players* (a *Draft* tab exists in the files). Pop-ups follow (*Search ▼ View ▼*,
  plus *Scout ▼ Assign ▼* on the scout tab) with *Filter ▼* at the right. The results `tbox`'s title
  is a live count sentence in yellow: "Well-known players in your region (4254 found)". A collapsible
  *Budget* `lbox` at the bottom holds two dash-led text lines.
- **Columns.** *Rec · Stat · Player · Club · Based · Pos · Value*, all white, with `--` placeholders in
  *Rec*. Players on loan from another club are orange `#ff9900` here (Files: `lfcl`, a different
  colour from the squad screen). Shortlisted players are yellow. The table is not striped.
- **The filter is a dialog**, not a side panel: see *Dialogs*. It has two collapsible sections,
  *General Settings* and *Attribute Settings*. The latter is a two-column grid of attribute name,
  a small numeric dropdown (`1 ▼`) and `−`/`+` steppers.

Job search (`job_info.xml`) and the national shortlist reuse the same striped-table-plus-filter
pattern (Files).

## Player profile

Shot: [M/216137](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216137/), [M/216138](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216138/), [M/219929](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219929/), [M/219938](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219938/). Files: `player_profile.xml`, `player_information.xml`, `player_form.xml`, `player_stats.xml`.

- **Title bar.** "5. Daniele Bonera (Parma)", that is, squad number, name and club, in the club's
  colours. The subtitle reads "Defender (Right/Centre), Italian (3 caps), Age 22". The tab strip has
  *Profile · Information · Form · History*, and *Show effects of training* sits at the top right.
- **Profile tab.** Three equal side-by-side `tbox` panels, *Technical · Mental · Physical*. Each is a
  two-column list with the attribute name left in white and the value right-aligned.
  - Values are `#ffd000`, or `#fff000` when ≥ 15 (`exca` = 15, Files). The two yellows are close,
    so a 15+ reads only slightly brighter.
  - The Physical panel ends with special rows (*Goalkeeper Rating, Condition, Preferred Foot,
    Morale*). Their labels are `#ffd000` and their values orange `#ff6400` ("74%", "Right Only",
    "Okay").
  - Attribute rows show faint alternating bands (Shot). The table definition has no `stripe_rows`,
    so the source of the banding is **unverified**.
- **Below the attribute panels** are full-width collapsible boxes.
  - *Selection Details* pairs labels with yellow values ("None").
  - *Statistics (Form: - - - - -)* is a table with a blue heading band (*Apps Gls Asts MoM Yel Red
    Tck Pass Sh Tar Fouls Fls Ag Av R*) and rows *Non Competitive, League, Cup, Continental,
    International, Overall*. Values are yellow, the *Red* column red `#ff0000` and *Av R* orange
    (Files: `player_stats.xml`; Shot).
- **Information tab.** Stacked collapsible label/value boxes: *Overview, Happiness, Contract
  Details* (one per owning club when co-owned). Labels are white and values yellow `#ffd000`.
- **Form tab.** "Recent games for Charlton Athletic" as a striped table: date (`#c8c8c8`),
  opponent, a sub marker ("sub 51"), then stat columns alternating `#ffff33` / `#ffd033` by column,
  with the rating at the end in `#32d0ff` (Files: `player_form.xml`). It sits above the same
  *Statistics* box.
- **Player comparison** ([M/219945](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219945/), `person_compare.xml`): the same three panels, with each value
  coloured by which player is better. The legend is spelled out in a *Legend* box:
  green (`#00c800`, bright `#00ff00`) for player 1 better, yellow (`#ffd000`/`#fff000`) for player 2
  better, grey `#c8c8c8` for the same, `-` for masked. "Other" rows such as average rating are
  orange `#ff7000`.

## Staff profile

Shot: [G/1873887359](https://cdn.gracza.pl/galeria/galeria_duze3/1873887359.jpg) (pre-release). Files: `non_player_profile.xml`.

- The title bar reads "Jens Bangsbo (Juventus)", with the subtitle "Assistant Manager, Danish, Age 44".
- Under a *Positions ▼* pop-up are three panels: *Coaching · Mental · Tactics*. Coaching and Mental
  values are yellow (`#ffd000`, `#fff000` when exceptional). The **Tactics panel is different**:
  its labels are yellow (`cats`) and its values are orange words (`catv` `#ff6400`): *Preferred
  Formation: Unknown, Playing Style: Mixed, Pressing Style: Closing Down, ...*.
- **Distinctive layout:** a *Coach Player Rankings (Striker)* table under the panels (*Rnk · Inf ·
  Name · Position(s) · Form · Morale · Cond. · Apps · Av R · Value*). The rank number sits in a small
  **blue rounded chip**, there are status badges, and the names are large white bold, with some in
  light blue `#66ccff` (on loan out, per the squad colour key).
- Two bottom boxes follow, side by side: *Overview* (DOB, languages) and *Contract Details*.
  Their values are light blue `#32d0ff` rather than yellow, which is the `cext` "extra info" role.

## Club information page

Files: `team_information.xml` (a scrolling *Overview* `tbox` of label/value rows, printable).
Shot of the club *History* screen: [M/219948](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219948/).

- The *Information* tab itself was **not captured** in any source found. By the file it is the
  same label/value box pattern as the player Information tab. Treat its look as **inferred**.
- **Club History** (Shot): title "Charlton History". The tabs are *Competitions · Landmarks · Records ·
  League Positions · Attendances* above and *Results · Sequences · Players · Transfers* below. A
  *View ▼* pop-up sits over a long label/value list headed *Modern Day* (yellow subheading), with
  labels white and values yellow.
- **League positions** (`league_positions.xml`) is a *Graph* box plus a *Teams* table. **Not
  captured.**

## League tables and fixtures

Shot: [M/219934](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219934/), [M/219951](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219951/), [M/216152](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216152/), [M/219922](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219922/), [M/219946](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219946/). Files: `league_stage.xml`, `fixtures.xml`, `competition_fixtures.xml`, `cup_stage.xml`.

- **Competition screen frame.** The title is the competition name ("European Championship
  Qualifying") with a subtitle, painted in a per-competition colour: blue ≈`#0850c8` with yellow
  text for Euro qualifying, white with navy text for the FA Cup, grey with white text for the
  European Champions Cup (Shot: M/219934, M/219946, M/219922). The tabs are *Groups/Rounds · Results · Fixtures · Schedule*,
  with *View ▼* left and *Group ▼* / *Round ▼* right.
- **League table.** Heading band: *Pos · Inf · Team · Pld · Won · Drn · Lst · For · Ag · G.D. · Pts*.
  - *Pos* is ordinal ("1st", "2nd"). *Inf* holds small green ▲ / red ▼ arrows for movement.
  - The team name is bold white, or yellow for your club. Columns are split by faint dashed
    vertical lines into groups (Pld | W D L | F A | GD Pts) (Shot: M/219951).
  - **Zone colouring** (Files, `bcol` per zone, exact): promotion `#00ff00`, top play-off
    `#ffff00`, bottom play-off `#ffd000`, relegation `#ff0000`. On screen these show as a
    **translucent row tint**, the relegation rows a dull red (≈`#5c383c`) (Shot: M/219951). In
    M/219934 the top two rows of a qualifying group are tinted green-olive.
- **Group fixtures under a table** (Shot: M/219934): yellow date headings centred ("Saturday 12th
  October 2002"), then centred "Home  2 : 0  Away" lines with the score digits in light blue
  `#32d0ff`.
- **Club fixtures list** (Shot: M/216152; Files: `fixtures.xml`): striped and selectable rows. The
  columns are date (`#c8c8c8`), time, `H`/`A`, opponent (large white), competition (`#ffd000`, so
  "Friendly" and "Serie A" read yellow) and result (`#32d0ff`). Action buttons sit under the table
  (*Past Meetings · Cancel Friendly · Arrange Friendly · Show Next Fixture*), and a *Fixture Details*
  label/value box follows below (labels white, values yellow).
- **Latest / evening results** (Shot: M/219922): a centred panel. Each line reads nation code
  (yellow) · team (right-aligned white) · (pos) · score in light blue · (pos) · team · nation code.
- **Cup draw** (Shot: M/219946): pairs in two columns with a `v` between them and a division tag
  (`PRM`, `D1`, ...) in yellow at the outer edges. Below sits *37 teams left to draw* as a
  two-column list.

## News inbox

Shot: [G/1873887265](https://cdn.gracza.pl/galeria/galeria_duze3/1873887265.jpg) (pre-release), [M/216140](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216140/), [M/219937](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219937/), [M/219956](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219956/). Files: `news.xml`.

- **Structure.** The title is "(manager name) News" in the club's colours. A button row reads
  *Next Unread · Next Response · Select All · Mark As Unread* (disabled ones greyed), with *Show
  Filters* at the right. Below it are **two stacked panels**, not side by side.
- **Top: *Inbox*.** It shows "61 messages displayed." in small white, then a short scrolling list,
  about six visible rows. The list is grouped by yellow day headings (*Today*, *Yesterday*, "Thu
  11th Dec 0:00"), and items are indented white headlines. The table is striped, selectable and
  multi-select, and the selected row is a solid blue-grey band.
- **Bottom: *Message*.** The panel title is the headline itself in yellow. Below it, a meta line
  reads "Date: Saturday 6th December 2003" (`#ffd000`) on the left and "Status: Read" (`#ffff00`) on
  the right. The body is **large bold white paragraphs** (`spec text, large`) over the photo.
  Response choices or buttons sit at the bottom right (*Respond To Transfer Speculation*, *Add To
  Notes*).
- **Interactive item, "Hold Talks With Player"** (Shot: [M/219936](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219936/)):
  stacked narrow boxes (*Grievance*, *Assistant Manager*, *Responses*) centred over the photo, with
  radio-bullet response options.

## Finances and board screens

Shot: [G/1873887203](https://cdn.gracza.pl/galeria/galeria_duze3/1873887203.jpg) (pre-release, River Plate), [M/219960](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219960/). Files: `finances.xml`, `confidence.xml`.

- **Finances** is one scrolling column of collapsible `lbox` sections: *Summary · Income ·
  Expenditure · Transfer Details · Salary*.
  - The summary opens with label/value rows (*Sponsors*, *Loans Outstanding*, "% of transfer
    revenue made available"), values in `#ffff00`.
  - Next comes a table with a blue heading band: *Item · This Month · Last Month · This Season ·
    Last Season*. Labels are white and the money columns **alternate** `#ffff00` / `#ffd000`
    column by column. A dashed rule separates the *Balance* row.
  - *Transfer Details*: *Player Name · Clause · Description*, with the clause in `#ffd000` and the
    description in `#ffff00`.
  - No striping, and sorting is disabled on every column (Files).
- **Club Confidence** (board) is a title bar ("Club Confidence", club colours) over four stacked
  collapsible boxes: *Board: Current Opinion · Board: Seasonal Expectations · Supporters: Current
  Opinion · Supporters: Seasonal Expectations*. Each holds plain white sentences, with no gauges or
  bars. *Make Board Request ▼* is a pop-up in the bottom bar.

## Match day

Shot: [G/1873887296](https://cdn.gracza.pl/galeria/galeria_duze3/1873887296.jpg) (pre-release), [M/219926](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219926/), [M/219927](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219927/), [M/219930](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219930/), [M/219940](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219940/), [M/219943](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219943/), [M/219951](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219951/), [M/219952](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219952/), [M/219954](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/219954/). Files: `match.xml`, `latest_scores.xml`, `match_controls.xml`.

- **Scoreboard instead of a title bar.** It splits into two halves, each filled with its **team's
  colour**: Charlton red, Arsenal yellow, Everton blue, Darmstadt navy, Wolves gold. The team name
  is large bold, left-aligned in the home half and right-aligned in the away half. Each score sits
  in its own **white rounded square** with large black digits, at the inner edge of each half.
- **Two tab strips frame the main panel** (Files: `match.xml` lists the panels):
  - Top: *Overview · Match Stats · Action Zones · 2D Pitch · Report*.
  - Bottom: *(home) Stats · Player Ratings · Latest Scores · League Table · (away) Stats*.
- **2D Pitch.** A striped green pitch with white lines. Players are small numbered discs in team
  colours, the ball-carrier is labelled with his name, and the match clock ("65:38") sits top left
  in a dark tag. A row of substitute discs runs along the top edge. A large "R" marks a replay.
- **The commentary is one line.** It is not a scrolling log. Under the bottom tabs, a full-width bar
  shows the current commentary sentence centred in bold. **The bar takes a team's colour**: red with
  white text for "GOAL FOR CHARLTON!!", yellow with dark text for "Saved by Jens Lehmann" (Arsenal),
  blue (≈`#0030a0`) for "Thomas Blank with the header!" (Darmstadt), light blue for 1860 München
  (Shot). That it follows the team in the event is **Inferred** from these six captures. The file
  defines the box as `no_border, darkened` with white text and a *Last 5 Mins* possession bar
  (Files).
- **Possession bar.** A full-width two-colour bar, home colour then away colour (red and yellow,
  blue and white), labelled *Possession* or *Last 5 Mins* at the left.
- **Overview** (Shot: M/219954): a *Match Incidents* box with two columns of scorer names and
  minutes ("Carlton Cole 45, 73"), "Score at half time: 2-4" in yellow, and a *Fixture* box with
  competition, referee, venue, weather and attendance (values yellow).
- **Match stats / ratings table** (Shot: M/219927): "Parma Stats" with a heading band
  *No. · C. · Name · Inf. · Pas · Cmp · Key · Tck · Won · ... · Con · Rat · Gls*, striped.
  - Players who played are white. **Unused subs are grey** (`subc` `#969696`), and subbed-off
    players show "sub 53" while replacements show "on 53".
  - The man of the match has a cyan ★ and a cyan name (`momc` `#32d0ff`). A small yellow card
    chip marks a booking.
  - A dashed rule separates the starting XI from the bench.
- **Incident colours** (Files: `match.xml`, `latest_scores.xml`, exact):

  | Incident | Hex |
  | --- | --- |
  | goal, own goal, man of the match | `#32d0ff` |
  | incident, penalty | `#ffffff` |
  | missed penalty | `#b4b4b4` |
  | yellow card | `#ffff00` |
  | red card | `#c80000` |
  | injury | `#ff6400` |
  | substitute | `#969696` |

- **Live league table** during a match (Shot: M/219951): the league table above with a red
  relegation tint, your club yellow.
- **Bottom bar** in a match: the fixture name in the ticker, then *Options ▼ · (home) Tactics ·
  (away) Tactics*, or *Exit Replay*.

## Main menu and new-game flow

Shot: [M/216131](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216131/) (full-size PNG linked under Sources), [M/216133](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216133/), [M/216132](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216132/). Files: `setup.xml`, `start_new_game.xml`, `add_manager.xml`, `preferences.xml`.

- **Main menu ("Start Menu").** The usual frame, with the sidebar's club-specific buttons greyed.
  - The title bar is navy `#1c346d` with "Championship Manager 03/04" in large cyan-blue `#009edf`
    and "Start Menu" beneath it.
  - One large panel has a centred yellow title in its top border, "Please choose from the following
    options".
  - Inside it is a **two-column list**: a wide rectangular blue button on the left (`#3c659d`,
    glossy gradient) and a white explanatory sentence on the right. The rows are *Play Game, Resume
    Last Game, View Match*, then *Quit* set apart at the bottom.
  - Backdrop: the default Wimbledon photo. The bottom bar reads *Welcome* at the right.
- **New game (`start_new_game.xml`).** A *Nations & Divisions* `tbox` with a table (*Selected
  Nations · Full Detail? · Start Date · Active Divisions*) and *Select All · Deselect All · Select
  Recommended* buttons, then a *Summary* box whose help text is yellow. **Not captured** in a
  screenshot.
- **Add New Manager** (Shot: M/216133): title "Add New Manager" with the subtitle "Enter The New
  Manager's Details". A narrow centred form of stacked boxes (*Profile, Details, Team*): white
  labels on the left, slate-blue fields and dropdowns on the right. Cascading pop-up menus open
  sideways (Italy ▶ Serie A ▶ club list). *Confirm* sits in the bottom bar.
- **Preferences** (Shot: M/216132): two-column form panels (*Game Settings, Display Settings, Server
  Settings*, collapsible *Custom Edit Files Settings*), with dropdowns and checkboxes as described
  above. The bottom bar holds *Cancel · Undo Changes · Confirm*.

## Dialogs and pop-up windows

Shot: [M/216143](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216143/), [M/216144](https://www.mobygames.com/game/11101/championship-manager-season-0304/screenshots/windows/216144/). Files: `dialog.xml`.

- **Generic dialog (Files).** Centred in its parent and sized to its content. Text sits at the top,
  with an optional edit field, and the buttons are right-aligned along the bottom in the order
  *Cancel · No · Yes · OK*, each shown only when needed. Return triggers OK. No screenshot of a plain
  message box was found.
- **Filter dialog (Shot).** A modal window about two-thirds of the screen wide, centred, over the
  **dimmed** screen behind.
  - It is an **opaque** slate-blue body (≈`#404c6c`) with a rounded lighter border. There is no
    photo inside it, which is the one place the backdrop does not show through.
  - A darker title strip (≈`#203454`) carries a centred bold yellow title ("Filters for Player
    Search").
  - The content scrolls, in collapsible yellow-titled sections. Each row is a checkbox and a label,
    then controls: recessed slate edit boxes, slate dropdowns with ▼, `−`/`+` mini buttons. Rows
    whose checkbox is off are dimmed.
  - The footer holds *Load... · Save...* on the left and *Reset · Cancel · OK* on the right, all
    blue pills.
- **Pop-up menus.** A dark translucent list with white items, the hovered item in yellow, ▶ for
  submenus, and disabled items grey (Shot: M/219924).
- **Tooltips.** A yellow box with black text (above).

## Coverage

| Screen kind | Coverage |
| --- | --- |
| Squad, player search, player profile, news, match day, league table, fixtures, main menu, dialogs | Well documented: several screenshots plus layout files |
| Staff profile, finances | One pre-release screenshot each, plus files |
| Board | One screenshot (Club Confidence), plus files |
| Club information tab, league-positions graph, new-game nation picker | Files only, no screenshot |

## Open questions

- Ter as the default skin is inferred from the executable's strings and the screenshots, not from a
  document.
- Whether backdrops are chosen per screen type, and by what rule.
- The full legend of the squad *Inf* badges, and what draws the faint banding on profile attribute
  rows.
- Whether the commentary bar's colour follows the team in the event or the team in possession.
- The font behind Ter's font number 5.
- How CM4's own default look differed. `settings.xml` defaults to a **white** wash at 70% with
  **black** text, which suggests CM4 shipped a light look by default (CM4, **unverified**: no
  CM4 screenshot was checked).
