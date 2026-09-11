# Championship Manager 03/04: Two-Row Top Navbar Specification

## 1. Purpose

This document defines how to adapt the navigation model of **Championship Manager: Season 03/04** from its original sidebar and menu-oriented interface into a modern, horizontal navbar with two rows:

1. a stable **primary navigation row** at the top; and
2. a **secondary contextual navigation row** immediately below it.

This specification is intentionally explicit so that an implementation LLM can generate the interface without having to infer navigation ownership, visibility rules, selection behavior, action placement, responsive behavior, or entity-specific contexts.

The adaptation must preserve the information density and management workflow of the original game while avoiding a persistent left sidebar.

---

## 2. Scope

This specification covers:

- global navigation;
- primary navigation domains;
- contextual secondary navigation;
- entity-specific profile navigation;
- pre-match, live-match, and post-match navigation;
- persistent global controls;
- page-level actions;
- route and state behavior;
- responsive behavior;
- accessibility requirements;
- terminology and naming rules;
- ambiguity-resolution rules for implementation.

This specification does **not** define:

- the visual design of every content page;
- the match engine;
- player or competition data models in full;
- the detailed contents of every modal or form;
- save-game file behavior.

---

## 3. Core navigation model

The application must use three separate interaction layers.

### 3.1 Layer 1: Primary navigation

The primary row represents stable management domains. Its position, order, and labels must remain stable during normal gameplay.

Primary navigation items:

1. Manager
2. Squad
3. Tactics
4. Training
5. Transfers
6. Club
7. Competitions
8. World
9. Search
10. More

The primary row must not be replaced by entity-specific tabs. For example, opening a player profile must not remove the primary row.

### 3.2 Layer 2: Secondary contextual navigation

The secondary row represents the pages available inside the selected primary domain or the currently displayed entity context.

Examples:

- when **Squad** is active, the secondary row includes First Team, Reserves, Under-19s, Selection, Fixtures, Statistics, and Reports;
- when a player profile is open, the secondary row changes to Overview, Attributes, Positions, Form, History, Contract, Transfer, Training, and Reports;
- during a live match, the secondary row changes to Match, Commentary, Statistics, Player Ratings, Tactics, Opposition, and Live Table.

The contextual row must contain destinations, not commands. Commands such as **Make Offer**, **Offer New Contract**, **Save Game**, or **Resign** belong in action menus, buttons, or confirmation dialogs.

### 3.3 Layer 3: Page-level actions

Page-level actions operate on the current page or selected entity.

Examples:

- Make Offer;
- Add to Shortlist;
- Request Scout Report;
- Compare Player;
- Offer New Contract;
- Move to Reserves;
- Save Tactic;
- Select Team;
- Confirm Lineup.

Page-level actions must not be presented as primary or secondary navigation tabs.

---

## 4. Overall navbar structure

### 4.1 Desktop structure

The desktop navbar must have the following conceptual layout:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Crest] Manager Squad Tactics Training Transfers Club Competitions World ... │
│                                              [Date] [Inbox] [Continue →]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Context selector, if required | Secondary tab | Secondary tab | ...          │
└──────────────────────────────────────────────────────────────────────────────┘
```

The primary row contains:

- a club crest or game identity area on the far left;
- primary navigation items in the center-left;
- global status and progression controls on the right.

The secondary row contains:

- an optional context selector on the left;
- contextual navigation tabs;
- horizontal overflow behavior when all tabs do not fit.

### 4.2 Required persistent controls

The following controls are global and must remain available independently of the active section:

- Back;
- Forward;
- current in-game date;
- Inbox with unread count;
- Continue or Go to Match;
- page-specific Actions menu;
- optional global search shortcut.

### 4.3 Continue button

**Continue** is the main game-loop action and must be visually dominant.

Behavior:

- in normal simulation state, label it **Continue**;
- when the next required event is a match, label it **Go to Match**;
- when the manager must resolve a blocking decision, the control may show a contextual label such as **Respond**, **Submit Team**, or **Attend Draw**;
- it must not silently advance when a blocking decision exists;
- it must display a disabled state with an explanation if progression is unavailable.

---

## 5. Primary navigation specification

## 5.1 Manager

### Purpose

Contains information and workflows related to the human-controlled manager, communication, board evaluation, career status, notes, jobs, and delegated responsibilities.

### Default landing page

`Manager > Overview`

### Secondary navigation

1. Overview
2. Inbox
3. Confidence
4. Notes
5. Jobs
6. Responsibilities
7. Career

### Page definitions

#### Overview

Must show:

- manager name;
- portrait or avatar, if supported;
- nationality;
- current club and role;
- reputation;
- preferred tactical style, if modeled;
- career record summary;
- current objectives;
- recent notable events.

#### Inbox

Must show:

- news messages;
- transfer offers;
- contract messages;
- injury updates;
- disciplinary updates;
- media messages;
- scouting completions;
- staff recommendations;
- competition notifications;
- messages requiring a response.

Inbox filters should include:

- All;
- Unread;
- Requires Action;
- Transfers;
- Squad;
- Scouting;
- Media;
- Competitions.

#### Confidence

Must separate:

- board confidence;
- board expectations;
- supporter confidence;
- supporter expectations;
- competition performance;
- transfer performance;
- tactical performance;
- squad management assessment.

#### Notes

Must support:

- creating a note;
- editing a note;
- deleting a note;
- associating a note with a player, staff member, club, nation, competition, or match;
- filtering and sorting notes;
- optional reminders tied to in-game dates.

#### Jobs

Must show:

- available jobs;
- insecure managers;
- vacant positions;
- clubs by reputation;
- club financial summary where known;
- application status;
- job-interest declarations where supported.

#### Responsibilities

Must define which staff member controls:

- first-team training;
- reserve-team training;
- youth-team training;
- friendly-match arrangement;
- reserve matches;
- youth matches;
- contract renewals;
- scouting assignments;
- team talks, if implemented;
- media duties, if implemented.

#### Career

Must show:

- clubs managed;
- dates of employment;
- matches, wins, draws, and losses;
- trophies;
- promotions and relegations;
- individual awards;
- historical reputation.

### Manager overflow actions

The following must be placed in an overflow or account-style action menu, not in the secondary row:

- Go on Holiday;
- Resign from Club;
- Retire Manager;
- Add Manager;
- Switch Manager, for multiplayer or hot-seat games.

Destructive actions must require confirmation. **Retire Manager** must use stronger confirmation than **Resign from Club**.

---

## 5.2 Squad

### Purpose

Contains squad lists, match selection, team availability, team-level statistics, fixtures, and staff assessments of current players.

### Default landing page

`Squad > First Team`

### Secondary navigation

1. First Team
2. Reserves
3. Under-19s
4. Selection
5. Fixtures
6. Statistics
7. Reports

Use **Youth Team** instead of **Under-19s** if the competition or club model does not enforce an under-19 age limit. The implementation must choose one canonical label and use it consistently.

### Page definitions

#### First Team

Shows senior players registered or assigned to the first-team squad.

#### Reserves

Shows reserve-team players and first-team players made available for reserve matches.

#### Under-19s

Shows academy or youth players assigned to the youth squad.

#### Selection

Shows:

- starting eleven;
- substitutes;
- unselected available players;
- unavailable players;
- eligibility warnings;
- registration warnings;
- positional coverage;
- captain assignment;
- tactical system currently attached to the selection.

#### Fixtures

Shows upcoming and completed fixtures for the selected squad level.

A squad selector must persist when moving between First Team, Reserves, Under-19s, and Fixtures.

#### Statistics

Must support at least:

- appearances;
- starts;
- substitute appearances;
- goals;
- assists, if modeled;
- player-of-the-match awards;
- average rating;
- yellow cards;
- red cards;
- clean sheets for goalkeepers;
- conceded goals for goalkeepers;
- minutes played.

#### Reports

Shows:

- assistant-manager reports;
- coach reports;
- suggested best eleven;
- perceived strengths and weaknesses;
- current ability;
- potential ability where known;
- form assessment;
- morale assessment.

### Squad local controls

These are view controls and must appear in a toolbar below the secondary navbar:

- View selector;
- Position filter;
- Squad-status filter;
- Availability filter;
- Registration filter;
- Sorting options;
- Column customization;
- Select Team;
- Ask Assistant.

### Required health and availability indicators

Player rows should visibly indicate:

- injury;
- suspension;
- international duty;
- ineligibility;
- lack of registration;
- low fitness;
- low match sharpness, if modeled;
- transfer listing;
- loan availability;
- morale concern.

---

## 5.3 Tactics

### Purpose

Contains the team’s tactical system, formation, team instructions, individual instructions, set-piece configuration, taker priority, and captain hierarchy.

### Default landing page

`Tactics > Formation`

### Secondary navigation

1. Formation
2. Team Instructions
3. Player Instructions
4. Set Pieces
5. Takers
6. Captains
7. Templates

### Page definitions

#### Formation

Must support:

- positioning players on the pitch;
- assigning players to positions;
- changing formation shape;
- displaying role suitability, if roles are implemented;
- showing unavailable or unselected positions;
- editing runs or directional instructions if the game model supports them.

#### Team Instructions

Contains global tactical settings such as:

- mentality;
- passing style;
- tempo;
- width;
- defensive line;
- tackling;
- pressing or closing down;
- time wasting;
- counterattacking;
- offside trap;
- creative freedom.

Only expose settings supported by the actual game rules. Do not invent tactical controls solely to imitate a newer football-management game.

#### Player Instructions

Must allow instructions to be assigned per selected player or tactical position.

The interface must make clear whether an instruction follows:

- the player;
- the tactical slot; or
- the current lineup assignment.

#### Set Pieces

Must contain configuration for:

- attacking corners;
- defending corners;
- attacking free kicks;
- defending free kicks;
- throw-ins, if implemented.

#### Takers

Must contain ordered priority lists for:

- penalties;
- direct free kicks;
- indirect free kicks, if distinct;
- left corners;
- right corners.

#### Captains

Must contain an ordered captain hierarchy, including captain and vice-captain.

#### Templates

Must support:

- create tactic;
- load tactic;
- save tactic;
- save tactic as;
- duplicate tactic;
- rename tactic;
- delete tactic;
- reset unsaved changes.

### Match-day behavior

During a live match, selecting **Tactics** must keep the user inside the active match context. It must not navigate to the normal out-of-match tactics workspace.

The live-match contextual row is specified in Section 8.

---

## 5.4 Training

### Purpose

Contains training schedules, player workload, staff assignments, progress reports, and individual development controls.

### Default landing page

`Training > Overview`

### Secondary navigation

1. Overview
2. Schedules
3. Players
4. Coaches
5. Assignments
6. Reports
7. Options

### Page definitions

#### Overview

Must summarize:

- current schedules;
- player workload;
- training performance;
- coaching coverage;
- development trends;
- concerns and recommendations.

#### Schedules

Must support:

- viewing schedules;
- creating schedules;
- editing schedules;
- duplicating schedules;
- assigning schedules to squads or players;
- deleting custom schedules.

#### Players

Must show individual:

- assigned schedule;
- workload;
- recent training performance;
- attribute trends;
- fitness implications;
- position retraining where supported.

#### Coaches

Must show:

- coaching staff;
- coaching attributes;
- workload;
- assigned categories;
- contract summary;
- current team assignment.

#### Assignments

Must allow coaches to be assigned to supported training categories. The interface must warn about uncovered categories and excessive workload.

#### Reports

Must provide weekly or periodic training reports, progress summaries, and staff recommendations.

#### Options

May include:

- train on match day;
- rest players after a match;
- suspend training during a selected period;
- preseason training period;
- squad-specific control delegation.

### Individual retraining

Position retraining should be accessible from both:

- `Training > Players`; and
- a player profile’s `Training` tab.

Both entry points must edit the same underlying assignment.

---

## 5.5 Transfers

### Purpose

Contains player recruitment, outgoing transfer activity, scouting, shortlists, staff recruitment, active negotiations, and completed deals.

### Default landing page

`Transfers > Transfer Centre`

### Secondary navigation

1. Transfer Centre
2. Player Search
3. Shortlist
4. Scouting
5. Staff Search
6. History

### Page definitions

#### Transfer Centre

Must show:

- incoming offers;
- outgoing offers;
- active player negotiations;
- contract negotiations tied to transfers;
- loan negotiations;
- completed pending moves;
- future transfers;
- clauses and future fees where supported;
- deadlines or expiring offers.

Use clearly separated states:

- Action Required;
- Negotiating;
- Accepted;
- Rejected;
- Withdrawn;
- Completed;
- Cancelled;
- Expired.

#### Player Search

Must support structured search using available database fields, including:

- player name;
- position;
- age range;
- nationality;
- current club;
- contract status;
- transfer status;
- loan status;
- value range;
- wage range;
- reputation;
- attributes;
- availability;
- scouting knowledge.

Search results must distinguish known values from unknown or masked values.

#### Shortlist

Must show saved recruitment targets and support:

- shortlist duration;
- notes;
- scout-report status;
- transfer status;
- contract expiry;
- sorting and filtering;
- removing one or multiple players.

#### Scouting

Must support assignments for:

- specific player;
- next opposition;
- nation;
- region;
- competition;
- youth players;
- general player profile filters.

It must show:

- assigned scout;
- destination or target;
- start date;
- expected completion date, if available;
- progress;
- status;
- resulting reports;
- recall or cancel action.

#### Staff Search

Must support searching for:

- assistant managers;
- coaches;
- scouts;
- physios;
- managers;
- other supported staff roles.

#### History

Must show:

- completed incoming transfers;
- completed outgoing transfers;
- completed loans;
- future transfers;
- fees;
- dates;
- selling and buying clubs.

### Player transfer actions

For an external player, the Actions menu may include:

- Make Offer;
- Approach to Sign, when eligible;
- Offer Trial, when eligible;
- Request Scout Report;
- Add to Shortlist;
- Remove from Shortlist;
- Compare With;
- Add Note;
- Declare Interest, if supported.

For a player owned by the user’s club, the Actions menu may include:

- Change Squad Status;
- Change Transfer Status;
- Change Loan Status;
- Offer New Contract;
- Offer to Clubs;
- Move to First Team;
- Move to Reserves;
- Move to Youth Team;
- Discipline;
- Release;
- Request Coach Report;
- Compare With;
- Add Note;
- Set Nickname.

Actions must be conditionally enabled. The UI must explain why an action is unavailable.

---

## 5.6 Club

### Purpose

Contains club-wide information, staff, schedule, finances, facilities, records, history, and club-specific transfer information.

### Default landing page

`Club > Overview`

### Secondary navigation

1. Overview
2. Staff
3. Fixtures
4. Finances
5. Facilities
6. Records
7. History
8. Transfers

### Page definitions

#### Overview

Must show:

- club name and crest;
- nation and city;
- current division;
- reputation;
- professional status;
- stadium;
- capacity;
- chairman or board information;
- major rivals;
- current competition participation.

#### Staff

Shows all playing and non-playing staff, with filters by role and squad assignment.

#### Fixtures

Shows the club’s complete schedule across all competitions, with competition and squad filters.

#### Finances

Must show, where supported:

- current balance;
- transfer budget;
- wage budget;
- committed wages;
- income;
- expenditure;
- transfer installments;
- future transfer fees;
- financial projections.

#### Facilities

Shows stadium, training facilities, and youth facilities if those concepts exist in the implementation.

#### Records

Shows club records such as:

- largest win;
- largest defeat;
- attendance records;
- appearance records;
- goalscoring records;
- transfer-fee records;
- winning and unbeaten runs.

#### History

Shows:

- league positions by season;
- historical competition performance;
- honours;
- past managers;
- notable historical records.

#### Transfers

Shows club-specific incoming, outgoing, loan, and future transfers.

### Confidence shortcut

A club-confidence widget may appear on Club Overview, but its canonical destination is `Manager > Confidence` because it evaluates the manager’s performance.

---

## 5.7 Competitions

### Purpose

Contains competition tables, fixtures, results, statistics, awards, rules, knockout trees, draws, coefficients, and historical winners.

### Default landing page

Open the manager’s current domestic league at `Competitions > Overview`, unless a different competition was most recently selected.

### Context selector

The secondary row must begin with a competition selector when a competition context is required.

Example:

```text
[Premier Division ▼] | Overview | Table | Fixtures | Results | Statistics | Awards | Rules
```

The selected competition must persist while moving between competition tabs.

### Secondary navigation

1. Overview
2. Table
3. Fixtures
4. Results
5. Statistics
6. Awards
7. Rules
8. History

Conditional tabs:

- Stages;
- Tree;
- Draw;
- Coefficients.

### Conditional visibility rules

- **Table** appears for league, group, or ranking-based competitions.
- **Stages** appears when the competition contains multiple stages.
- **Tree** appears for knockout competitions.
- **Draw** appears when a draw event or completed draw exists.
- **Coefficients** appears only for competition systems that use coefficients.
- **Awards** appears only if awards exist for the selected competition.

### Page definitions

#### Overview

Shows current stage, title holders, next fixtures, recent results, leading performers, and qualification context.

#### Table

Shows standings and must explain abbreviations, tie-break rules, qualification zones, playoff zones, and relegation zones.

#### Fixtures

Shows scheduled fixtures by round, stage, or date.

#### Results

Shows completed matches by round, stage, or date.

#### Statistics

May include:

- leading goalscorers;
- most assists;
- highest average rating;
- most player-of-the-match awards;
- clean sheets;
- yellow cards;
- red cards;
- team attack and defense statistics.

#### Awards

Shows competition awards, award periods, nominees where applicable, and historical winners.

#### Rules

Must describe:

- structure;
- scoring;
- tie-breakers;
- registration rules;
- substitution rules;
- foreign-player restrictions;
- qualification;
- relegation;
- disciplinary rules;
- prize money, if modeled.

#### History

Shows past winners, runners-up, and historical performance.

---

## 5.8 World

### Purpose

Provides database-wide browsing of nations, clubs, international teams, regions, and rankings.

### Default landing page

`World > Nations`

### Secondary navigation

1. Nations
2. Clubs
3. International
4. Regions
5. Rankings

### Page definitions

#### Nations

Shows national associations and nation-level information.

#### Clubs

Shows all discoverable clubs. Original classifications such as major clubs, league clubs, non-league clubs, and other clubs should be implemented as filters, not separate permanent tabs.

Recommended filters:

- All Clubs;
- Major Clubs;
- League Clubs;
- Non-League Clubs;
- Other Clubs;
- Nation;
- Division;
- Reputation;
- Professional Status.

#### International

Shows senior and youth national teams, including Under-21 teams where present.

#### Regions

Shows geographic groupings used for browsing and scouting.

#### Rankings

Shows supported club, nation, or competition rankings and coefficients.

---

## 5.9 Search

### Purpose

Provides universal and structured search across game entities.

### Default behavior

Activating Search must focus the universal search input immediately.

Placeholder text:

```text
Search players, staff, clubs, nations and competitions…
```

### Secondary navigation

1. Quick Search
2. Players
3. Staff
4. Clubs
5. Nations
6. Recent
7. Saved Searches

### Search result grouping

Universal results must be grouped by entity type:

- Players;
- Staff;
- Clubs;
- Nations;
- Competitions.

Every result must show enough disambiguating information. For example, player results should include age, position, nationality, and current club when known.

### Recent

Shows recently searched terms and recently opened search results. It must not replace the global Back/Forward history.

### Saved Searches

Allows reusable structured filters. Saved searches must retain filter criteria, sorting, and visible columns.

---

## 5.10 More

### Purpose

Contains lower-frequency game utilities, history, preferences, save operations, help, credits, and session-level commands.

### Default landing behavior

**More** should open a dropdown or panel. If implemented as a full page, its default route is `More > History`.

### Items

- History;
- Game Status;
- Hall of Fame;
- Add Manager;
- Manager Chat, when relevant;
- Preferences;
- Save;
- Save As;
- Help;
- Credits;
- Community Information, if retained;
- Print, if retained;
- Quit Game.

### Definitions

#### History

Navigation history of previously viewed pages and entities. It must preserve enough context to reopen the prior state.

#### Game Status

Shows loaded leagues, database information, active managers, in-game date, save metadata, and processing status.

#### Hall of Fame

Shows manager rankings and historical achievements.

#### Preferences

Contains interface, display, sound, gameplay, simulation, and accessibility settings.

#### Save and Save As

- **Save** writes to the current save slot.
- **Save As** requests a new name or slot.
- saving must expose progress and success or failure feedback;
- the application must prevent accidental duplicate submissions while saving.

#### Quit Game

Must require confirmation if unsaved progress exists.

---

## 6. Entity-specific contextual navigation

When an entity is opened, the secondary row must switch from the selected primary section’s tabs to entity-specific tabs. The primary row remains visible and the originating section remains visually active.

Example:

- user opens `Transfers > Shortlist`;
- user selects a player;
- primary item **Transfers** remains active;
- secondary row changes to player-profile tabs;
- Back returns to the same shortlist state.

## 6.1 Player profile

Secondary navigation:

1. Overview
2. Attributes
3. Positions
4. Form
5. History
6. Contract
7. Transfer
8. Training
9. Reports
10. Relationships, when supported
11. Injuries, when relevant
12. Notes

### Player-profile rules

- **Contract** displays contract facts; **Offer New Contract** is an action.
- **Transfer** displays status, interest, clauses, and history; **Make Offer** is an action.
- **Reports** shows scout reports for external players and coach reports for owned players.
- unknown or masked information must be visibly distinguished from a zero or negative value.

## 6.2 Staff profile

Secondary navigation:

1. Overview
2. Attributes
3. Contract
4. Career
5. Assignments
6. Reports
7. Notes

## 6.3 Club profile

Secondary navigation:

1. Overview
2. Squad
3. Staff
4. Fixtures
5. Results
6. Transfers
7. Finances
8. History
9. Records

## 6.4 Nation profile

Secondary navigation:

1. Overview
2. Senior Team
3. Under-21s
4. Players
5. Fixtures
6. Results
7. Competitions
8. History

## 6.5 Competition profile

Secondary navigation:

1. Overview
2. Table
3. Fixtures
4. Results
5. Statistics
6. Awards
7. Rules
8. History

Conditional tabs follow the rules in the Competitions section.

## 6.6 Match profile outside a live match

Secondary navigation:

1. Overview
2. Lineups
3. Commentary
4. Statistics
5. Player Ratings
6. Events

Only show information available for the selected match.

---

## 7. Pre-match navigation

When the next event is a match, the user enters a pre-match context.

### Secondary navigation

1. Overview
2. Team Selection
3. Tactics
4. Opposition
5. Past Meetings
6. Conditions

### Page definitions

#### Overview

Shows fixture, competition, venue, kickoff date, form, and major alerts.

#### Team Selection

Shows starting eleven, substitutes, eligibility, tactical assignment, captain, and unresolved lineup issues.

#### Tactics

Uses the current match-specific tactical configuration.

#### Opposition

Shows known opposition squad, likely formation, scouting report, strengths, weaknesses, and key players.

#### Past Meetings

Shows previous matches between the two clubs.

#### Conditions

Shows weather, pitch condition, attendance context, referee, odds, and other available match conditions.

### Progression rule

The user must not be allowed to start the match while mandatory lineup requirements are unresolved. The interface must identify each blocking issue.

---

## 8. Live-match navigation

During a live match, the secondary row must switch to match-specific destinations.

### Secondary navigation

1. Match
2. Commentary
3. Statistics
4. Player Ratings
5. Tactics
6. Opposition
7. Live Table, when applicable

### Page definitions

#### Match

Displays the primary match visualization and main event feed.

#### Commentary

Displays chronological match commentary and event filtering.

#### Statistics

Displays team match statistics and event summaries.

#### Player Ratings

Displays current player performance, condition, disciplinary state, goals, assists, and substitutions.

#### Tactics

Allows match-specific tactical changes and substitutions.

#### Opposition

Shows the opponent’s currently observed shape, players, substitutions, and known tactical information.

#### Live Table

Appears only when the match belongs to a table-based competition for which a live table can be computed.

### Live-match global control

The primary progression control may become:

- Pause;
- Play;
- Continue;
- Skip to Next Highlight;
- Make Changes;
- Confirm Changes.

The exact control depends on match-engine state.

---

## 9. Post-match navigation

After a match, expose:

1. Summary
2. Statistics
3. Player Ratings
4. Commentary
5. Other Results
6. Table, when applicable

The post-match context must retain access to the match report after the user continues to later dates.

---

## 10. Navigation state and history

### 10.1 State preservation

When navigating away from a list and returning, preserve:

- selected filters;
- sorting;
- visible columns;
- pagination or virtual-scroll position;
- selected squad;
- selected competition;
- selected stage or round;
- expanded groups;
- active tab where appropriate.

### 10.2 Back and Forward

Back and Forward must behave like in-application history, not browser page reloads.

A history entry should capture:

- route;
- entity identifier;
- active primary section;
- active secondary tab;
- relevant context selector;
- recoverable list state.

### 10.3 Origin preservation

If the same player can be opened from Squad, Transfers, Search, or World, the player route may be identical, but navigation history must retain the origin so Back returns to the correct page.

---

## 11. Route model

The following examples are conceptual. The implementation may use different route syntax, but it must preserve equivalent hierarchy and state.

```text
/manager/overview
/manager/inbox
/manager/confidence

/squad/first-team
/squad/reserves
/squad/youth
/squad/selection

/tactics/formation
/tactics/team-instructions
/tactics/player-instructions

/training/overview
/training/schedules

/transfers/centre
/transfers/player-search
/transfers/shortlist
/transfers/scouting

/club/:clubId/overview
/club/:clubId/fixtures
/club/:clubId/finances

/competitions/:competitionId/overview
/competitions/:competitionId/table
/competitions/:competitionId/fixtures

/world/nations
/world/clubs

/search/quick
/search/players

/players/:playerId/overview
/players/:playerId/attributes
/players/:playerId/contract

/staff/:staffId/overview
/nations/:nationId/overview
/matches/:matchId/overview
/matches/:matchId/live
```

### Route ownership

Entity-profile routes must accept origin metadata in navigation state. Do not encode transient origin state into the canonical entity URL unless deep-link preservation requires it.

---

## 12. Selection and active-state rules

### Primary active state

- Exactly one primary item should normally appear active.
- When an entity is opened, keep the originating primary item active.
- If an entity is opened from outside a clear domain, such as a global notification, infer the most appropriate domain from the entity type:
  - player or staff recruitment item: Transfers;
  - owned squad player: Squad;
  - club profile: World or Club if it is the user’s club;
  - competition: Competitions;
  - manager message: Manager.

### Secondary active state

- Exactly one visible secondary tab must be active.
- Conditional tabs must not leave an invalid active state after context changes.
- If the selected tab becomes unavailable, navigate to the context’s default tab and notify assistive technology of the change.

---

## 13. Responsive behavior

## 13.1 Wide desktop

Display all high-priority primary items if space allows.

Suggested priority:

1. Manager
2. Squad
3. Tactics
4. Training
5. Transfers
6. Club
7. Competitions
8. World
9. Search
10. More

## 13.2 Medium desktop or tablet landscape

Keep visible:

- Manager;
- Squad;
- Tactics;
- Training;
- Transfers;
- Club;
- Competitions;
- Continue.

World and Search may become icon-supported items or move into overflow. More remains the overflow entry.

## 13.3 Narrow layout

A narrow layout may use a compact top bar plus a primary overflow control, but it must not introduce a permanent sidebar.

Requirements:

- Continue remains visible;
- current section remains identifiable;
- secondary tabs scroll horizontally and do not wrap to a third row;
- selected tabs must scroll into view automatically;
- overflow menus must be keyboard accessible;
- labels must not be replaced with ambiguous icons unless a tooltip and accessible name are provided.

---

## 14. Accessibility requirements

The navbar must support:

- full keyboard navigation;
- visible focus states;
- semantic navigation landmarks;
- correct tab semantics for the secondary row when it behaves as a tab list;
- accessible names for icon-only controls;
- unread counts announced meaningfully;
- no reliance on color alone for active, warning, injury, suspension, or disabled states;
- sufficient color contrast;
- reduced-motion preferences;
- horizontal-tab scrolling by keyboard;
- screen-reader announcements when context changes.

Recommended keyboard behavior:

- `Tab` moves between major controls;
- arrow keys move between tabs inside a tab list;
- `Enter` or `Space` activates the focused item;
- `Alt+Left` and `Alt+Right` may map to Back and Forward;
- a documented shortcut may focus global search;
- a documented shortcut may activate Continue.

Destructive actions must not use a keyboard shortcut that can be triggered accidentally.

---

## 15. Visual and interaction hierarchy

### Primary row

Use the strongest persistent navigation styling.

### Secondary row

Use a visually lighter treatment than the primary row, but clearly indicate the active tab.

### Context selector

The selector must look distinct from tabs. It changes the object being viewed, while tabs change the page for that object.

### Page header

Below the navbar, include:

- page or entity title;
- optional subtitle;
- breadcrumbs where useful;
- key status indicators;
- page-level Actions menu;
- high-priority contextual button where required.

### Alerts

Navigation badges may indicate:

- unread inbox messages;
- actions required;
- pending transfer responses;
- squad-selection issues;
- injuries;
- scouting reports completed.

Badges must communicate actionable or time-sensitive information. Do not use badges merely as decoration.

---

## 16. Terminology rules

Use destination-oriented nouns for navigation:

- Overview;
- Fixtures;
- Statistics;
- Reports;
- Finances;
- History.

Use verbs for actions:

- Save;
- Continue;
- Make Offer;
- Add to Shortlist;
- Request Report;
- Resign.

Do not mix a destination and an action under the same label.

Examples:

- **Contract** means “view contract information.”
- **Offer New Contract** means “start a contract negotiation.”
- **Transfer** means “view transfer information.”
- **Make Offer** means “start a transfer bid.”
- **Training** means “view training information.”
- **Assign Schedule** means “change the player’s schedule.”

---

## 17. Ambiguity-resolution rules for an implementation LLM

An implementation LLM must follow these rules whenever the design leaves multiple possible choices:

1. Preserve the ten primary navigation labels and their order unless a product requirement explicitly changes them.
2. Never add a persistent sidebar.
3. Never move Continue into an overflow menu.
4. Treat the secondary row as contextual and replace its contents when an entity or match context is active.
5. Keep the originating primary section active while showing entity-specific secondary tabs.
6. Put destinations in navigation and commands in action controls.
7. Prefer a filter over a new tab when the choice only changes a list subset.
8. Prefer a context selector over duplicated tabs for choosing a competition, squad, club, or season.
9. Hide tabs that have no meaningful content in the current context rather than showing permanently empty pages.
10. Do not invent modern football-management concepts unless supported by the project’s domain model.
11. Display unknown information as unknown, masked, or unavailable. Never display unknown values as zero.
12. Preserve list and filter state when opening an entity and navigating back.
13. Require confirmations for destructive or irreversible actions.
14. Explain disabled actions rather than silently ignoring input.
15. Keep labels consistent across navbar tabs, headings, breadcrumbs, and routes.
16. If horizontal space is insufficient, use overflow or horizontal scrolling. Do not create a third navbar row.
17. If a secondary tab becomes invalid after a context change, select the context’s default tab.
18. If a feature is not implemented, omit its tab. Do not show non-functional navigation.

---

## 18. Canonical navigation map

```text
Primary: Manager
Secondary:
  - Overview
  - Inbox
  - Confidence
  - Notes
  - Jobs
  - Responsibilities
  - Career
Actions/overflow:
  - Go on Holiday
  - Resign from Club
  - Retire Manager
  - Add Manager

Primary: Squad
Secondary:
  - First Team
  - Reserves
  - Under-19s or Youth Team
  - Selection
  - Fixtures
  - Statistics
  - Reports
Local controls:
  - View
  - Filter
  - Sort
  - Select Team
  - Ask Assistant

Primary: Tactics
Secondary:
  - Formation
  - Team Instructions
  - Player Instructions
  - Set Pieces
  - Takers
  - Captains
  - Templates

Primary: Training
Secondary:
  - Overview
  - Schedules
  - Players
  - Coaches
  - Assignments
  - Reports
  - Options

Primary: Transfers
Secondary:
  - Transfer Centre
  - Player Search
  - Shortlist
  - Scouting
  - Staff Search
  - History

Primary: Club
Secondary:
  - Overview
  - Staff
  - Fixtures
  - Finances
  - Facilities
  - Records
  - History
  - Transfers

Primary: Competitions
Context selector:
  - Selected competition
Secondary:
  - Overview
  - Table, when applicable
  - Fixtures
  - Results
  - Statistics
  - Awards, when applicable
  - Rules
  - History
  - Stages, when applicable
  - Tree, when applicable
  - Draw, when applicable
  - Coefficients, when applicable

Primary: World
Secondary:
  - Nations
  - Clubs
  - International
  - Regions
  - Rankings

Primary: Search
Secondary:
  - Quick Search
  - Players
  - Staff
  - Clubs
  - Nations
  - Recent
  - Saved Searches

Primary: More
Items:
  - History
  - Game Status
  - Hall of Fame
  - Add Manager
  - Manager Chat, when relevant
  - Preferences
  - Save
  - Save As
  - Help
  - Credits
  - Community Information, if retained
  - Print, if retained
  - Quit Game
```

---

## 19. Acceptance criteria

The navbar adaptation is complete only if all of the following are true:

- there is no persistent sidebar;
- there are exactly two navbar rows in the standard desktop layout;
- the primary row remains stable across standard screens;
- the secondary row updates according to section, entity, and match context;
- Continue or its contextual replacement remains visible and prominent;
- entity-specific tabs do not replace the primary row;
- Back returns to the originating list with its previous state preserved;
- page-level actions are not misrepresented as navigation tabs;
- competition and squad selectors do not create redundant navigation items;
- conditional tabs appear only when their content is valid;
- destructive actions require confirmation;
- keyboard navigation and accessible naming are implemented;
- the layout does not wrap into a third navigation row;
- unknown or masked information is represented accurately;
- unimplemented features do not produce dead tabs or placeholder routes.

---

## 20. Implementation summary

The intended interface has a stable top-level row for management domains and a second row for the current domain or entity. The primary row answers **“Which part of the game am I managing?”** The secondary row answers **“Which page of this section or entity am I viewing?”** Page actions answer **“What can I do here?”**

Maintaining these three responsibilities as separate layers is the central requirement of this adaptation.
