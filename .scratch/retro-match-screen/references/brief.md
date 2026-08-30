# Brief: Retro Football Manager Match Screen

Source: supplied by the user (charting session for `.scratch/retro-match-screen`), verbatim. The
three reference screenshots it describes (Reference A/B/C) are **not** in the repo — see ticket 04.

---

The three screenshots show the same core football management match-summary screen in different match
states, resolutions, teams, and game versions. The correct clone should therefore be implemented as
one reusable, data-driven screen rather than three separate layouts.

Below is a detailed implementation brief that can be given directly to an LLM coding agent.

## LLM Agent Development Brief: Retro Football Manager Match Screen

### 1. Mission

Build a functional clone of the football management match screen represented by the three supplied references.

The implementation must reproduce:

- The overall screen composition
- The fixed left navigation rail
- The two-team scoreboard
- Match clock and completed-match states
- Tabbed match navigation
- Match-incident summary
- Fixture metadata
- Bottom statistical navigation
- Possession visualization
- Match controls and tactical buttons
- Responsive behavior across the supplied screen sizes
- The glossy, compact, early-2000s football-management visual style

The application must be data-driven. Team names, team colors, scores, incidents, match information,
tabs, possession, and buttons must come from structured state rather than being embedded directly in
the UI.

Do not copy original logos, photographs, trademarks, proprietary fonts, or other protected assets.
Create original stadium backgrounds, generic club identities, and visually similar but distinct UI
assets.

### 2. What the References Show

#### 2.1 Shared screen structure

All three references contain the same layout:

- Narrow vertical sidebar on the left
- Match clock or match status at the top of the sidebar
- Previous and next navigation buttons
- Continue Game button
- Manager profile button
- Competition navigation
- Nations and Clubs navigation
- Screen History navigation
- Game Options navigation
- Large two-team scoreboard across the top
- Horizontal match-view tabs
- Large translucent overview panel over a stadium photograph
- Match Incidents section
- Fixture-information panel
- Horizontal contextual-statistics tabs
- Possession bar
- Bottom match-status strip
- Options and tactics controls at bottom right

The main content begins immediately to the right of the sidebar and occupies nearly the entire
remaining viewport.

#### 2.2 Screen state differences

- **Reference A: completed cup match.** Match status: Full Time. Match minute shown: 121. Home team:
  Sunderland. Away team: Blackburn. Score: 5-3. Competition: League Cup Quarter Final. Match
  apparently went to extra time. Summary text: HT 0-1 / FT 3-3 ET 5-3. Injury incident is
  highlighted in orange. Possession strongly favors Sunderland. Team header colors are red and white.
- **Reference B: completed league match.** Date and time are shown instead of Full Time. Home team:
  Wolves. Away team: Charlton. Score: 3-5. Competition: Premier Division. Halftime score: 2-4. Team
  header colors are gold and red. Possession is almost evenly divided. The manager-profile button
  displays a different name. Bottom status area is simpler and appears to have no scrolling match
  label.
- **Reference C: completed league match.** Match status: Full Time. Match minute: 94. Home team:
  Tottenham. Away team: Blackburn. Score: 3-3. Competition: Premier Division. Halftime score: 0-2.
  Team header colors are white and yellow. Possession favors the away side. A central bottom status
  strip shows the fixture followed by small plus symbols and another tournament label.

These differences must be represented as variations of the same component and state model.

### 3. Recommended Technical Direction

Use the existing repository stack if one is already present.

For a new web implementation, use:

- TypeScript with strict mode
- React
- CSS Modules, vanilla CSS, or another locally scoped styling system
- Vite
- Vitest
- React Testing Library
- Playwright for visual and interaction testing
- Zod for runtime validation of fixture data

Do not add a large UI framework unless the repository already uses one. The visual language is
sufficiently specialized that generic framework components will require substantial overrides.

Required engineering qualities:

- Strictly typed data
- No duplicated screen implementations
- No match-specific values in presentation components
- No unexplained numeric constants scattered through the code
- Accessible keyboard interaction
- Deterministic rendering
- Responsive handling of the supplied aspect ratios
- Original replacement assets
- Clear separation between match state, derived values, and presentation
- Tests for state-dependent labels and visual proportions

### 4. Target Viewport and Scaling Model

The references use approximately the following desktop dimensions:

- 1024 x 768
- 940 x 704

Both are close to a 4:3 aspect ratio.

#### Primary design canvas

Use a logical design space of: 1024 x 768

#### Scaling rules

- Preserve a 4:3 game viewport whenever possible.
- Scale the entire interface proportionally when the browser is smaller than the design canvas.
- Avoid independently wrapping major horizontal areas.
- Maintain a minimum usable logical width of approximately 800px.
- For wider browser windows: Center the 4:3 game viewport, or allow the main content area to grow
  while keeping the sidebar fixed.
- Do not allow team names or scores to push the header onto multiple lines.
- Use truncation for exceptionally long team names.
- At supplied reference sizes, every control should remain visible without browser scrolling.

A straightforward implementation can place the application in a 1024 x 768 logical container and use
a scale transform based on the available viewport. If this approach is used, pointer coordinates,
focus outlines, and text clarity must be tested carefully.

### 5. Global Layout

Use CSS Grid for the top-level application:

```
┌──────────┬──────────────────────────────────────────────┐
│ Sidebar  │ Scoreboard                                   │
│          ├──────────────────────────────────────────────┤
│          │ Primary tabs                                 │
│          ├──────────────────────────────────────────────┤
│          │ Match overview over stadium background       │
│          │                                              │
│          ├──────────────────────────────────────────────┤
│          │ Fixture information                          │
│          ├──────────────────────────────────────────────┤
│          │ Secondary tabs                               │
│          ├──────────────────────────────────────────────┤
│          │ Possession                                   │
│          ├──────────────────────────────────────────────┤
│          │ Bottom command bar                           │
└──────────┴──────────────────────────────────────────────┘
```

Recommended logical dimensions:

- Sidebar width: 84 to 90 px
- Main horizontal gap: 5 to 8 px
- Top scoreboard height: 64 to 70 px
- Primary tabs height: 22 to 25 px
- Main overview area: flexible, approximately 380 to 430 px
- Fixture panel height: 96 to 108 px
- Secondary tabs height: 22 to 25 px
- Possession panel height: 40 to 48 px
- Bottom toolbar height: 30 to 34 px

The exact dimensions may be adjusted during screenshot comparison, but all dimensions should be
represented as named design tokens.

### 6. Visual Design System

#### 6.1 Overall style

The interface should resemble an early-2000s desktop sports-management game:

- Dense information hierarchy
- Dark blue chrome
- Rounded rectangular panels
- Beveled surfaces
- Glossy gradients
- Thin light inner borders
- Dark outer strokes
- Compact typography
- Strong yellow highlight color
- Semi-transparent black content panels
- Stadium photography visible underneath
- Slight visual texture or restrained noise

The interface should not look like a modern flat dashboard.

#### 6.2 Color tokens

Create semantic tokens similar to:

```css
:root {
  --chrome-blue-top: #416a9f;
  --chrome-blue-mid: #214d84;
  --chrome-blue-bottom: #153963;

  --panel-dark: rgba(5, 12, 13, 0.72);
  --panel-dark-strong: rgba(6, 10, 12, 0.86);
  --panel-border-light: rgba(255, 255, 255, 0.30);
  --panel-border-dark: rgba(0, 0, 0, 0.85);

  --text-primary: #f4f4f4;
  --text-muted: #c4ccd7;
  --text-highlight: #fff400;
  --text-warning: #ff7200;

  --score-box: #f2f2f2;
  --score-text: #080808;

  --possession-divider: rgba(0, 0, 0, 0.35);
  --focus-ring: #fff400;
}
```

Team colors must be supplied through match data:

```ts
interface TeamTheme {
  primary: string;
  secondary: string;
  foreground: string;
}
```

Do not assume that the home side always uses red or that the away side always uses white.

#### 6.3 Gradients and borders

Most blue buttons use:

- Lighter blue at the top
- Medium blue in the center
- Dark blue at the bottom
- One-pixel light inner highlight
- One-pixel or two-pixel dark outer border
- Rounded corners between 5 and 8 pixels

Large dark content panels should use:

- Black or dark green overlay at 60% to 80% opacity
- Thin translucent light border
- Dark drop shadow
- Small corner radius

The scoreboard must be visually dominant and brighter than the rest of the interface.

#### 6.4 Typography

Use an original, legally distributable rounded display font or a system-compatible approximation.

Typography characteristics:

- Heavy rounded font for team names
- Bold compact font for navigation
- Bold or semibold font for incident names
- Yellow section headings
- White values where appropriate
- Yellow values for important fixture metadata

Suggested fallback stack:

```
font-family:
  "Trebuchet MS",
  "Arial Rounded MT Bold",
  Arial,
  sans-serif;
```

Approximate logical sizes:

- Team names: 24 to 29 px
- Score numbers: 22 to 28 px
- Section headings: 16 to 18 px
- Tab labels: 11 to 13 px
- Incident names: 12 to 14 px
- Fixture labels: 11 to 13 px
- Fixture values: 11 to 13 px
- Sidebar labels: 11 to 13 px
- Clock minute: 25 to 30 px
- Version label: 8 to 10 px

Apply subtle text shadows to improve contrast.

### 7. Sidebar Specification

#### 7.1 Structure

The sidebar is a full-height blue textured column.

From top to bottom:

- Status or date block
- Previous/next controls
- Continue Game button
- Manager/profile button
- Competitions button
- Nations & Clubs button
- Screen History button
- Game Options button
- Flexible empty area
- Version label near the bottom

#### 7.2 Status variants

The top block supports at least two display modes.

Match-time mode:

```
Full Time
121
```

or:

```
Full Time
94
```

Calendar-time mode:

```
Wednesday
17.12.2003
19:30
```

The layout must be based on the supplied state, not inferred from the score.

#### 7.3 Navigation arrows

Two square buttons appear side by side.

- Left button contains a yellow left-pointing triangle.
- Right button contains a yellow right-pointing triangle.
- Disabled state reduces opacity and saturation.
- Buttons must respond to pointer and keyboard activation.
- Include accessible labels such as Previous screen and Next screen.

#### 7.4 Sidebar buttons

Sidebar buttons:

- Fill most of the sidebar width
- Use two-line wrapping where needed
- Have dark blue gradient treatment
- Use white text
- Use bright yellow text for selected or high-priority items

The Continue Game and Game Options labels appear yellow in the references.

#### 7.5 Version label

Display a small yellow-green version indicator near the lower-left or lower-center area.

This value belongs in application metadata:

```ts
interface ApplicationMetadata {
  versionLabel: string;
}
```

### 8. Scoreboard Specification

#### 8.1 Composition

The scoreboard is composed of:

- Home-team colored region on the left
- Home score box close to the center
- Away score box close to the center
- Away-team colored region on the right

Approximate proportional layout:

- Home region: 49%
- Away region: 51%
- Score boxes: approximately 54 to 62 px wide each
- Outer height: approximately 64 to 70 px

The center boundary is visually tight. The score boxes nearly touch but remain distinct.

#### 8.2 Home side

- Team name aligned left
- Team name vertically centered
- 12 to 18 pixels of horizontal padding
- Score box aligned toward the center
- Score box uses a light gray or white face
- Score box has a dark border and rounded corners

#### 8.3 Away side

- Team name aligned right
- Team name vertically centered
- Score box aligned toward the center
- Same score-box design as home side

#### 8.4 Dynamic foreground color

Calculate or explicitly configure text color based on the team background.

Examples from the references:

- White text on a red header
- Black text on a gold header
- Dark blue text on a white or yellow header
- Dark blue text with a shadow on bright yellow

Prefer an explicit foreground property in the team theme so the design remains deterministic.

#### 8.5 Score treatment

Scores are large, bold, centered, and black.

The score box needs:

- White to light-gray vertical gradient
- Dark two-pixel outline
- Small internal top highlight
- Subtle lower shadow
- Rounded corners around 10 pixels

The header and score boxes must not shift when a one-digit score changes.

### 9. Primary Match Tabs

Tabs shown in the references:

- Overview
- Match Stats
- Action Zones
- 2D Pitch
- Report
- Behavior

Overview is selected in all three references.

- Selected text is bright yellow.
- Unselected text is white or pale gray.
- Tabs share one connected blue bar.
- Each tab has a subtle vertical separator.
- Hover state brightens the tab.
- Keyboard arrow navigation should be supported.
- Enter and Space should activate the focused tab.

#### Availability

Support disabled tabs. A disabled tab should have:

- Lower text contrast
- No hover effect
- `aria-disabled="true"`
- No activation

The 2D Pitch label appears less prominent in some references and can be represented as disabled
depending on state.

### 10. Stadium Background and Overlay

#### 10.1 Background behavior

The main content uses a stadium photograph that continues visually beneath the dark information
panels.

The background should:

- Fill the main content area
- Use cover
- Keep the field and stands recognizable
- Be darkened by an overlay
- Remain static during normal interaction
- Change based on venue or fixture if multiple assets are available

Use only original or licensed background imagery.

#### 10.2 Layering

Recommended layers:

- Stadium image
- Global dark tint
- Match overview translucent panel
- Fixture translucent panel
- Secondary tab bar
- Possession panel
- Bottom toolbar

The stadium must remain visible but should never reduce text readability.

### 11. Match Incidents Panel

#### 11.1 Header

Display: Match Incidents

Treatment:

- Yellow text
- Bold
- Left aligned
- Small inset from the panel edges

#### 11.2 Incident organization

The references organize events into a left team column and a right team column.

Each side displays:

- Participant or event label
- Minute values
- Multiple minutes separated by commas
- Names left aligned
- Minutes aligned toward the center boundary or opposite edge

Recommended conceptual layout:

```
Home event name        minute(s) | Away event name        minute(s)
```

For visual fidelity, use four grid columns:

```css
grid-template-columns:
  minmax(0, 1fr)
  60px
  minmax(0, 1fr)
  60px;
```

At smaller resolutions, reduce the minute-column widths without wrapping ordinary minute values.

#### 11.3 Incident types

Support at least:

- Goal
- Own goal
- Yellow card
- Red card
- Substitution
- Injury
- Missed penalty
- Penalty scored
- Generic event

Suggested model:

```ts
type MatchIncidentType =
  | "goal"
  | "own-goal"
  | "yellow-card"
  | "red-card"
  | "substitution"
  | "injury"
  | "penalty-scored"
  | "penalty-missed"
  | "other";

interface MatchIncident {
  id: string;
  side: "home" | "away";
  participantName: string;
  minutes: number[];
  stoppageTime?: number[];
  type: MatchIncidentType;
  displayText?: string;
}
```

Do not encode minute lists as preformatted strings in domain state. Format minute arrays in a
presentation helper.

Examples:

- 24
- 45, 57
- 2, 33
- 45, 73

#### 11.4 Injury highlighting

The injury row in the first reference is orange:

- George McCartney injured

Use the warning color only for relevant incidents. Do not make all incidents yellow.

#### 11.5 Halftime and final summary

Support summary formats such as:

- Score at half time: 2-4
- Score at half time: 0-2
- HT 0-1 / FT 3-3 ET 5-3

The summary is:

- Yellow
- Bold
- Positioned below the incident rows
- Left aligned
- Generated from structured match-period data

Suggested model:

```ts
interface MatchPeriodScores {
  halfTime?: Score;
  fullTime?: Score;
  extraTime?: Score;
  penalties?: Score;
}
```

Suggested derivation:

- If extra-time data exists, show halftime, full-time, and extra-time values.
- Otherwise show "Score at half time: H-A".
- If penalty data exists, append a penalties result in a distinct segment.
- Labels should be localizable.

### 12. Fixture Panel

#### 12.1 Structure

The fixture panel sits under the main incident area and spans the content width.

It contains:

- Yellow Fixture heading
- Three information rows on the left
- Three information rows on the right

Left side:

- Competition
- Referee
- Venue

Right side:

- Date
- Weather
- Attendance

#### 12.2 Grid

Use a two-column layout with label/value pairs:

```
Competition    Premier Division       Date          Saturday 1st November 2003
Referee        Alan Wiley             Weather       Dry 3°C
Venue          White Hart Lane        Attendance    34133
```

Each half contains:

- Label column with white text
- Value column with yellow text

Recommended responsive grid:

```css
grid-template-columns:
  105px minmax(0, 1fr)
  105px minmax(0, 1.25fr);
```

#### 12.3 Attendance formatting

The screenshots show values without thousands separators:

- 34133
- 28050
- 38742

Allow a formatting configuration:

```ts
interface NumberFormattingOptions {
  useGrouping: boolean;
}
```

Default to the visual convention of the reference screen for clone mode.

#### 12.4 Date formatting

The references use long English date text with ordinals:

- Wednesday 17th December 2003
- Saturday 8th November 2003
- Saturday 1st November 2003

Implement a real date formatter. Do not store the entire formatted date unless the source data is
legacy imported text.

Pay special attention to ordinal rules:

- 1st, 2nd, 3rd, 4th
- 11th, 12th, 13th
- 21st, 22nd, 23rd

#### 12.5 Weather model

Weather should be structured:

```ts
interface MatchWeather {
  condition: "dry" | "wet" | "snow" | "windy" | "overcast";
  temperatureCelsius: number;
}
```

Presentation examples:

- Dry -1°C
- Wet 7°C
- Dry 3°C

### 13. Secondary Context Tabs

The lower tab bar changes according to the fixture context.

Observed labels include:

- Sunderland Stats
- Player Ratings
- Latest Scores
- Blackburn Stats

and:

- Tottenham Stats
- Player Ratings
- Latest Scores
- League Table
- Blackburn Stats

The component must accept an array:

```ts
interface SecondaryTab {
  id: string;
  label: string;
  disabled?: boolean;
}
```

Do not assume a fixed number of tabs.

Rules:

- Distribute available width evenly unless configured otherwise.
- Use white text.
- Active tab may appear slightly brighter or pressed.
- Preserve the connected blue-bar appearance.
- Handle five tabs at 940 pixels without wrapping.

### 14. Possession Panel

#### 14.1 Layout

The possession row contains:

- Possession label at the left
- Long horizontal track
- Home segment entering from the left
- Away segment entering from the right
- Center line or segment boundary

The label occupies approximately 75 to 90 logical pixels.

#### 14.2 Dynamic color behavior

Possession colors correspond to team themes.

Examples:

- Red home segment and white away segment
- Gold home segment and red away segment
- White home segment and yellow away segment

Use team theme colors, not an independent hardcoded chart palette.

#### 14.3 Data and validation

```ts
interface PossessionStats {
  home: number;
  away: number;
}
```

Validation rules:

- Values must be finite.
- Values must be nonnegative.
- Values should sum to 100.
- If imported data differs because of rounding, normalize before rendering.
- Do not render negative widths.
- Expose accessible text such as "Home possession 52%, away possession 48%".

#### 14.4 Segment geometry

- Render percentage widths directly.
- Do not fake a half-and-half bar with a centered overlay. The visual boundary must move according to
  possession.
- Add subtle internal tick marks or separators if required to match the references.

### 15. Bottom Command Bar

#### 15.1 Center status region

The lower-left or center region may show:

- Fixture name
- Competition name
- Round
- Decorative separators
- A blank or inactive track

Example conceptual content:

```
Tottenham v Blackburn   +++   League Cup 4th Rnd
```

Represent this as structured status segments:

```ts
type BottomStatusSegment =
  | { type: "text"; value: string }
  | { type: "separator"; value?: string }
  | { type: "spacer" };
```

The bar can be empty for match states that do not require a status label.

#### 15.2 Options button

Display: Options ▼

Behavior:

- Opens a small menu above the button
- Closes on outside click
- Closes on Escape
- Supports keyboard navigation
- Uses the same blue chrome
- Maintains correct stacking above other panels

Potential original options:

- Save Match Report
- View Match Details
- Return to Schedule
- Display Preferences

Do not copy proprietary menu content unless supplied by the project.

#### 15.3 Tactics buttons

Display one tactics button per team:

```
Sunderland Tactics
Blackburn Tactics
```

or the corresponding active teams.

Behavior:

- Opens the selected team's tactical view
- Uses unique team identifiers internally
- Never derives navigation from the visible team name
- Disabled for users without control permissions
- Uses full club name unless width requires ellipsis
- Accessible name should include the entire club name

### 16. Proposed Data Model

```ts
interface Score {
  home: number;
  away: number;
}

interface Club {
  id: string;
  name: string;
  shortName?: string;
  theme: {
    primary: string;
    secondary: string;
    foreground: string;
  };
}

interface FixtureDetails {
  competition: string;
  round?: string;
  referee: string;
  venue: string;
  kickoff: string;
  attendance: number;
  weather: {
    condition: "dry" | "wet" | "snow" | "windy" | "overcast";
    temperatureCelsius: number;
  };
}

interface MatchClockState {
  mode: "scheduled" | "live" | "half-time" | "full-time";
  elapsedMinutes?: number;
  currentDateTime?: string;
  displayLabel?: string;
}

interface MatchScreenState {
  matchId: string;
  homeTeam: Club;
  awayTeam: Club;
  score: Score;
  periodScores: {
    halfTime?: Score;
    fullTime?: Score;
    extraTime?: Score;
    penalties?: Score;
  };
  clock: MatchClockState;
  fixture: FixtureDetails;
  incidents: MatchIncident[];
  possession: {
    home: number;
    away: number;
  };
  primaryTab: string;
  primaryTabs: Array<{
    id: string;
    label: string;
    disabled?: boolean;
  }>;
  secondaryTab?: string;
  secondaryTabs: SecondaryTab[];
  stadiumBackgroundId: string;
  bottomStatus: BottomStatusSegment[];
  permissions: {
    canContinue: boolean;
    canEditHomeTactics: boolean;
    canEditAwayTactics: boolean;
  };
}
```

Validate external or fixture JSON with Zod before rendering.

### 17. Component Architecture

Use components similar to:

```
MatchScreen
├── Sidebar
│   ├── MatchStatusBlock
│   ├── HistoryNavigation
│   ├── ContinueButton
│   ├── SidebarNavigation
│   └── VersionLabel
├── MatchWorkspace
│   ├── Scoreboard
│   │   ├── TeamHeader
│   │   ├── ScoreBox
│   │   └── TeamHeader
│   ├── PrimaryTabs
│   ├── StadiumSurface
│   │   ├── MatchOverviewPanel
│   │   │   ├── SectionHeading
│   │   │   ├── IncidentColumns
│   │   │   └── PeriodScoreSummary
│   │   └── FixturePanel
│   ├── SecondaryTabs
│   ├── PossessionPanel
│   └── BottomCommandBar
│       ├── MatchStatusStrip
│       ├── OptionsMenu
│       └── TacticsButtons
```

Separation rules:

- Components must not know fixture-specific values.
- Formatting functions should live outside visual components.
- Match derivations should be memoized selectors where appropriate.
- UI components should receive already validated data.
- Navigation actions should be event callbacks or commands, not direct global mutations.
- Team color contrast logic should be centralized.

### 18. Interaction Requirements

#### Continue Game

When selected:

- If the match is complete, navigate to the next scheduled game state or post-match workflow.
- If the interface represents an interrupted live state, resume simulation.
- Show a brief pressed state.
- Prevent duplicate activation while the command is processing.

#### Screen history arrows

- Left navigates backward in screen history.
- Right navigates forward.
- Disabled when no corresponding history entry exists.

#### Tabs

- Switch visible content without remounting the entire match shell.
- Preserve active match and sidebar state.
- Support browser history if the project routing system does so elsewhere.

#### Team tactics

- Route to the corresponding team-specific tactics screen.
- Retain current match as return context.

#### Options

- Menu must render above the bottom toolbar.
- Menu must not be cropped by a parent with `overflow: hidden`.
- Use a portal if necessary.

### 19. Responsive Behavior

At approximately 1024 x 768:

- Use full logical dimensions.
- Preserve generous incident-panel height.
- Display all fixture fields in one row-based two-column layout.
- Team names use full size.

At approximately 940 x 704:

- Reduce horizontal paddings slightly.
- Reduce scoreboard team-name size by approximately 1 to 2 logical pixels if needed.
- Keep sidebar width visually consistent.
- Do not wrap secondary tabs.
- Reduce main incident panel height before removing content.
- Keep the fixture panel at approximately the same relative height.
- Keep all bottom buttons visible.

Below 800 logical pixels:

- If support is required: scale the 4:3 canvas instead of restructuring into a mobile interface.
- Optionally present a message recommending landscape orientation.
- Do not convert the interface into stacked cards because that would cease to be a faithful
  recreation.

### 20. Accessibility Requirements

Despite the intentionally retro appearance:

- Use semantic button elements.
- Use `role="tablist"`, `role="tab"`, and `role="tabpanel"`.
- Provide visible keyboard focus.
- Ensure selected tabs expose `aria-selected`.
- Ensure disabled items expose `aria-disabled`.
- Add accessible text for the possession bar.
- Do not communicate injuries, cards, or states through color alone.
- Stadium imagery must be decorative unless venue information is intentionally conveyed.
- Provide sufficient text contrast above the stadium.
- Respect reduced-motion preferences.
- Avoid flashing or rapidly animated chrome.

### 21. Animation Guidelines

Animations should be restrained.

Allowed:

- 80 to 140 millisecond button press
- Short tab crossfade
- Menu opening fade
- Possession bar transition when data changes
- Subtle scoreboard update pulse

Avoid:

- Continuous gloss movement
- Large sliding panels
- Bouncing buttons
- Modern spring animations
- Excessive blur
- Layout-shifting transitions

The target interface should feel like a responsive desktop application from the early 2000s.

### 22. Required Fixture Scenarios

Create at least three fixtures matching the structural differences visible in the references, but
use original names and content if distributing the project publicly.

**Scenario 1: Extra-time finish.** Must demonstrate:

- Full Time label
- Elapsed value above 120
- Extra-time score
- Halftime score
- Full-time regulation score
- Injury incident
- Uneven possession
- Four secondary tabs

**Scenario 2: High-scoring league match.** Must demonstrate:

- Calendar date/time sidebar mode
- Different team header colors
- Multiple minute values for one participant
- Almost even possession
- Long referee or venue values

**Scenario 3: Draw.** Must demonstrate:

- Full Time label
- Elapsed value in stoppage-time range
- Equal final score
- Halftime deficit
- Five secondary tabs
- Bottom status segments
- Different possession split

### 23. Testing Requirements

#### Unit tests

Test at least:

- Correct score rendering
- Team colors applied to the correct side
- Long date ordinal formatting
- Weather formatting
- Multiple incident minutes
- Injury visual class
- Halftime summary generation
- Extra-time summary generation
- Possession normalization
- Tactics callbacks receive club IDs
- Disabled history buttons cannot activate
- Disabled tabs cannot activate

#### Component tests

Test:

- Switching primary tabs
- Switching secondary tabs
- Opening and closing Options
- Escape closes Options
- Outside click closes Options
- Keyboard activation of buttons
- Correct sidebar mode for full-time and calendar states
- Correct permissions on tactics buttons

#### Visual regression tests

Capture at:

- 1024 x 768
- 940 x 704
- 1280 x 960

Verify:

- Score boxes remain centered
- Sidebar remains aligned
- Tabs do not wrap
- Fixture data remains inside the panel
- Possession boundary matches the supplied data
- Bottom buttons do not overflow
- Stadium overlay preserves text readability

#### End-to-end tests

Minimum flow:

- Open match overview.
- Navigate to Match Stats.
- Return to Overview.
- Open Options.
- Close Options with Escape.
- Open home-team tactics.
- Return to match.
- Press Continue Game.
- Verify exactly one continue command is emitted.

### 24. Visual-Fidelity Checklist

The agent must compare the implementation against the references and confirm:

- Sidebar occupies roughly 8% to 9% of total width.
- Scoreboard dominates the top content row.
- Score boxes are close to the center boundary.
- Home name is left aligned.
- Away name is right aligned.
- Primary tabs sit immediately below the scoreboard.
- Stadium background is visible across the central area.
- Overview panel is translucent rather than opaque.
- Match Incidents heading is yellow.
- Incident names and minutes follow a consistent column grid.
- Event warnings are visually distinct.
- Fixture panel contains two groups of three rows.
- Fixture values are yellow.
- Secondary tabs span the available width.
- Possession colors come from team themes.
- Bottom tactics buttons remain right aligned.
- All major panels use beveled blue or translucent dark styling.
- No modern card shadows, oversized spacing, or flat-design conventions have been introduced.

### 25. Explicit Non-Goals

Do not implement the following unless separately requested:

- Complete football simulation engine
- Player database
- Real club trademarks
- Online multiplayer
- Transfer system
- Full tactics editor
- Original game data extraction
- Pixel-perfect reproduction of copyrighted assets
- Mobile-first redesign
- Modern analytics charts
- 3D match engine

The immediate goal is a high-quality, reusable match-screen clone with realistic interactions and
mock match data.

### 26. Agent Execution Order

The coding agent should work in this order:

1. Inspect the repository and document the existing architecture.
2. Identify the current build, lint, test, and formatting commands.
3. Define design tokens and match-state schemas.
4. Create validated mock fixtures covering the three screen states.
5. Implement the top-level 4:3 layout.
6. Implement the sidebar.
7. Implement the scoreboard.
8. Implement primary tabs.
9. Implement the stadium surface and overlays.
10. Implement incident rendering and period summaries.
11. Implement fixture metadata.
12. Implement secondary tabs.
13. Implement the possession bar.
14. Implement the bottom command bar.
15. Add keyboard and accessibility behavior.
16. Add unit and component tests.
17. Add Playwright screenshot tests.
18. Run all validation commands.
19. Compare screenshots at both reference resolutions.
20. Correct spacing, typography, overflow, and alignment differences.
21. Produce a concise implementation report.

Do not stop after assembling static HTML. The acceptance target includes interaction, data
validation, test coverage, responsive scaling, and visual comparison.

### 27. Required Final Report from the Agent

The development agent must finish with:

- **Implementation summary**: Components added, state model added, interactions implemented,
  responsive strategy, accessibility work.
- **Validation**: typecheck command and result, lint command and result, unit-test command and
  result, end-to-end command and result, production-build command and result.
- **Visual checks**: 1024 x 768 result, 940 x 704 result, known visual differences.
- **Files changed**: list of created and modified files.
- **Known limitations**: concise list only.
- **Suggested commit**: Conventional Commit message.

Suggested commit format:

```
feat(match-ui): add retro football match overview screen
```