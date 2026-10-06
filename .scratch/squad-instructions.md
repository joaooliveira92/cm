# Task: Reproduce the “Squad” screen from the supplied references

Implement a faithful recreation of the supplied football-management-game Squad screen.

The two reference images are not separate pages. They represent two views of the same `Squad` route:

1. `contract` view:
   A full-width table titled “Players (Contract View)”.

2. `positions` view:
   A two-column roster titled “Players (Position(s))”.

Both views must reuse the same page shell, navigation, controls, player data source, selection state, position filters, and footer navigation.

Do not create two duplicated page implementations. Build one Squad screen whose central content changes according to the selected view.

Use original project assets and original game data where they already exist. If an exact referenced asset is unavailable, create a visually similar but original replacement. Do not copy proprietary logos, photographs, fonts, or textures from another game.

---

# 1. Overall visual target

Reproduce an early-2000s desktop football-management interface at a fixed logical reference size of 1024 × 768.

The screen should feel:

- Dense and information-heavy
- Compact rather than spacious
- Built from blue metallic panels
- Framed with thin beveled borders
- Slightly textured
- Dominated by dark navy, cobalt blue, steel blue, charcoal, and muted olive
- Accented with saturated yellow
- Designed around small text and tightly packed controls

Do not modernize the interface.

Avoid:

- Large whitespace
- Rounded mobile-style cards
- Material Design
- Glassmorphism
- Oversized modern typography
- Floating action buttons
- Hamburger menus
- Large shadows
- Excessive animation
- A generic dashboard appearance

The final result must look like a desktop game UI from approximately the 2003–2004 period.

---

# 2. Reference coordinate system and scaling

Use 1024 × 768 as the reference canvas.

At the reference size:

- Left navigation rail: approximately 88 px wide
- Main application area: begins around x = 92 px
- Main application width: approximately 928 px
- Outer gaps: approximately 4 px
- Header height: approximately 68 px
- Primary tab bar height: approximately 22 px
- Context toolbar height: approximately 35 px
- Bottom section tabs: approximately 22 px
- Bottom status strip: approximately 27 px

Prefer a desktop-first implementation.

If the viewport is larger than 1024 × 768:

- Scale the interface proportionally or center it within the available viewport.
- Preserve the original aspect ratio and density.
- Do not stretch only one axis.

If the viewport is smaller:

- Preserve usability through controlled scaling or scrolling.
- Do not independently reflow the central roster into a modern mobile layout.
- The two-column positional roster should remain two columns for as long as the reference layout can reasonably be displayed.

---

# 3. Shared page structure

Implement the screen in this order:

1. Left navigation rail
2. Club header
3. Primary club navigation tabs
4. Squad toolbar
5. Main roster panel
6. Position selector panel
7. Bottom section navigation
8. Bottom status ticker

Recommended component hierarchy:

SquadScreen
├── Sidebar
│   ├── DateTimePanel
│   ├── HistoryNavigation
│   └── SidebarActions
├── ClubHeader
├── ClubNavigationTabs
├── SquadToolbar
├── SquadContent
│   ├── ContractView
│   └── PositionView
├── PositionFilterBar
├── SquadSectionTabs
└── StatusTicker

Use semantic data models and shared components rather than embedding roster text directly into JSX or templates.

---

# 4. Left navigation rail

Create a permanent vertical sidebar approximately 88 px wide.

## 4.1 Background

- Dark desaturated blue base
- Subtle vertical gradient
- Fine grid, fabric, or scanline texture
- Thin brighter edge on the right
- Panels separated by narrow dark gaps

## 4.2 Date and time block

At the top, display four centered lines:

- “Sunday”
- “3.8.2003”
- “9:00”

Use bright yellow text.

Typography:

- Small condensed or rounded sans-serif
- Bold
- Tight line-height
- Center aligned

The time should be visually separated from the date by a small gap.

## 4.3 History buttons

Below the date block, place two square navigation controls side by side:

- Left-pointing yellow triangle
- Right-pointing triangle in a muted yellow-green color

Each button should:

- Fill roughly half the sidebar width
- Have a blue beveled background
- Have a thin slate border
- Provide visible pressed and hover states

## 4.4 Main sidebar buttons

Stack these controls vertically:

- Continue Game
- Martin Smith
- Competitions
- Nations & Clubs
- Screen History
- Game Options

Visual behavior:

- “Continue Game” uses bright yellow text.
- “Game Options” uses bright yellow text.
- Other entries use white text.
- Each button is a compact blue beveled rectangle.
- Multi-line labels are centered.
- Buttons are separated by approximately 3–4 px.
- Avoid modern pill styling.

At the bottom-left corner, display a tiny yellow version label:

- “4.1.4”

---

# 5. Club header

The header occupies nearly the full width of the main application area.

## 5.1 Header panel

- Height: approximately 68 px
- Dark cobalt-to-navy gradient
- Thin steel-blue outer border
- Rounded corners of approximately 9 px
- Subtle fabric or grid texture
- Faint decorative dark-blue circular forms near the right edge
- Inset highlight along the top and left edges

## 5.2 Header content

Centered text:

- Club name: “Parma”
- Subtitle: “12th in Italian Serie A”

Club name styling:

- Large
- Bold
- Bright yellow
- Approximately 29–32 px at the reference size
- Tight line-height

Subtitle styling:

- Bright yellow
- Approximately 15–17 px
- Bold
- Positioned below the club name

Near the left side of the header, include a small dark square control with a right-pointing blue triangle.

---

# 6. Primary club navigation tabs

Directly below the header, create six equal-width tabs:

- Squad
- Staff
- Information
- Finances
- Fixtures
- Transfers

Behavior:

- `Squad` is active.
- Active tab text is yellow.
- Inactive tab text is white.
- Tabs use a blue vertical gradient.
- Each tab has a beveled top highlight and dark lower edge.
- Adjacent tabs share borders without large gaps.
- Height is approximately 22 px.
- Corners are slightly rounded only at the outer edges of the complete tab row.

The tab row width should match the header and central panels.

---

# 7. Squad toolbar

Below the primary tabs, create a dark toolbar approximately 34–35 px high.

The toolbar contains compact dropdown controls on the left and a checkbox on the right.

## 7.1 Contract view toolbar

Show:

- `View ▼`
- `Team ▼`

## 7.2 Position view toolbar

Show:

- `View ▼`
- `Sort ▼`
- `Team ▼`

The `Sort` control may be conditionally visible because the two references show a different toolbar composition.

## 7.3 Dropdown appearance

Each dropdown should:

- Be 68–76 px wide, depending on its label
- Be approximately 22 px high
- Use a medium-blue gradient
- Have a thin steel-blue border
- Use small bold white text
- Include a white downward triangle
- Have moderately rounded corners, around 7 px
- Show clear hover, active, focus, and open states

## 7.4 Show Filters control

At the far right:

- Small square blue checkbox
- Label: “Show Filters”
- White bold text
- Vertically aligned with the dropdowns

The checkbox should control the visibility of any extended filter panel supported by the application. If no extended filter panel is currently implemented, preserve the state and expose an empty extensibility slot rather than making the checkbox nonfunctional.

---

# 8. Main roster panel: shared styling

Both roster views occupy the same central panel.

Panel characteristics:

- Thin blue-gray outer border
- Slightly rounded corners
- Dark translucent overlay
- Background football image or an original football-action replacement
- Background image is low contrast and heavily dimmed
- Olive, gray, brown, and navy tones dominate the image treatment
- Content remains readable over the background
- Inner inset border approximately 4–5 px from the outer border

Add a semi-transparent dark overlay above the background image. The roster itself should remain the clearest layer.

Panel title:

- Bright yellow
- Bold
- Approximately 15–17 px
- Left aligned
- Positioned at the top with approximately 14 px left padding

Titles:

- Contract view: `Players (Contract View)`
- Position view: `Players (Position(s))`

Do not use a large standalone heading. The title should be integrated into the upper border region of the panel.

---

# 9. Contract view

The contract view is a full-width table with a visible header and vertical scrollbar.

## 9.1 Table columns

Use these columns in this order:

1. Pkd
2. Inf
3. Name
4. Squad Status
5. Basic Wage
6. Contract
7. Offer Options
8. Asking Price

Approximate proportions:

- Pkd: 5%
- Inf: 4%
- Name: 27%
- Squad Status: 13%
- Basic Wage: 13%
- Contract: 10%
- Offer Options: 18%
- Asking Price: 10%

Allow small adjustments to prevent clipping, but preserve the same visual hierarchy.

## 9.2 Header row

The header row should:

- Use a steel-blue gradient
- Be approximately 17–19 px high
- Use very small bold white text
- Center most headings
- Use thin vertical separators
- Have slightly rounded outer corners
- Remain visible while the table body scrolls, if practical

## 9.3 Body rows

Rows should:

- Be approximately 22–23 px high
- Use alternating translucent charcoal and brown-gray backgrounds
- Preserve visibility of the dim football background
- Have minimal or no horizontal gridlines
- Align numeric values consistently
- Use compact bold white text
- Highlight selected or linked player names with cyan or light blue
- Highlight particular names in orange when their state requires emphasis

Visible example values from the reference include:

- Squad statuses: First Team, Rotation, Backup, Hot Prospect
- Wages such as £14,500, £4,300, and £36,000
- Dates such as 30.6.2006 and 1.7.2005
- Offer option: None
- Asking prices in formats such as £13.25M, £8.25M, £7M, and £2M

Use the project’s real player data when available. The reference values are layout examples, not mandatory application data.

## 9.4 Pkd column

Display a small rounded rectangular slot for every player.

Visual style:

- Pale blue vertical gradient
- Bright top edge
- Darker bottom edge
- Thin gray-blue border
- Approximately 40 px wide and 20 px high
- Empty by default

Treat the slot as an interactive selection or picked-state control.

Provide:

- Default state
- Hover state
- Selected state
- Keyboard focus state
- Disabled state, if required by data

## 9.5 Inf column

Display compact circular status badges.

Examples visible in the reference:

- Orange badge labeled `Lmp`
- Green badge labeled `Wnt`
- Green badge labeled `Loa`
- Green badge labeled `Lst`
- Teal badge labeled `GK`

Badge requirements:

- Approximately 20 px in diameter
- Small white or dark lettering, selected for contrast
- Tight horizontal spacing
- Tooltip or accessible label explaining the abbreviation

Do not rely only on color to communicate status.

## 9.6 Contract table scrolling

Place a narrow custom scrollbar at the right edge:

- Blue track
- Medium-blue thumb
- Small up and down arrow buttons
- Thumb position reflects scroll position
- Mouse wheel, pointer dragging, touchpad, Page Up, Page Down, Home, and End should work

The main page shell should remain stationary while the roster body scrolls.

---

# 10. Position view

The position view renders players as two parallel columns separated by a narrow center divider.

## 10.1 Column structure

Each roster column contains:

1. Pkd slot
2. Status badge
3. Player name
4. Position abbreviation aligned to the far right

The center divider should:

- Be located near the horizontal midpoint
- Use a thin dotted or dashed light-gray line
- Extend only through the roster body
- Avoid touching the title or position selector panel

## 10.2 Rows

Rows should:

- Be approximately 23 px high
- Use alternating translucent dark stripes
- Have compact vertical spacing
- Align both columns row for row
- Use bold player-name text
- Use bright yellow position text

Example position labels visible in the reference:

- GK
- SW/D RLC
- D/DM RLC
- D RC
- D/M L
- D C
- DM RLC
- DM C
- M C
- AM R
- F RC
- F RLC
- F C
- S C

Position text must be right aligned within each half.

Player-name color states:

- White: standard
- Cyan/light blue: linked, selected, or informational state
- Orange: special condition or emphasis
- Muted dark gold/brown: unavailable, inactive, or disabled state

Do not determine behavior from color alone. Store a semantic player display state and derive the color from that state.

## 10.3 Sorting behavior

The `Sort` dropdown should alter the player ordering.

Support at least:

- Position
- Name
- Squad status
- Wage
- Contract expiry
- Asking price

When sorted by position, group players using a football-position order similar to:

1. GK
2. SW
3. D
4. DM
5. M
6. AM
7. F
8. S

Within a group, apply the selected secondary order consistently.

Split the resulting ordered list into two visual columns without changing the data identity of the players.

---

# 11. Position selector panel

Below the roster, create a separate bordered panel approximately 57 px high.

## 11.1 Heading

Centered label:

- `Positions`

Styling:

- Bright yellow
- Bold
- Approximately 15–17 px
- The label visually interrupts or overlaps the panel’s top border
- Add a dark background behind the label so the border does not run through the text

## 11.2 Position buttons

Display a single row of compact buttons:

- GK
- DR
- DL
- DC
- DC
- MR
- ML
- MC
- MC
- FC
- FC
- SB1
- SB2
- SB3
- SB4
- SB5
- SB6
- SB7
- SB8
- SB9
- SB10
- SB11
- SB12

The duplicate position labels represent distinct lineup slots and must be uniquely identifiable internally. For example:

- `dc-left`
- `dc-right`
- `mc-left`
- `mc-right`
- `fc-left`
- `fc-right`

Button styling:

- Approximately 35 px wide for short labels
- Smaller widths may be used for narrow screens, but labels must remain legible
- Blue gradient background
- Tiny white bold text
- Thin bright-blue border
- Small corner radius
- Minimal spacing between controls

`GK` appears green in the reference and should be supported as an active or category-specific state.

Interactions:

- Clicking a position filters or highlights applicable players.
- Clicking an already selected position clears that filter.
- Shift-click or a platform-appropriate modifier may enable multi-select.
- Keyboard navigation must work.
- Expose selected state with more than color, such as inset border or pressed styling.

---

# 12. Bottom section tabs

Below the position selector, create a five-tab navigation bar:

- Tactics
- Training
- Last Match
- Serie A
- History

Requirements:

- Equal-width tabs
- Blue gradient
- White text
- Thin bevel borders
- Height around 22 px
- `Last Match` appears dimmed or disabled in the reference
- `Serie A` may act as the active context tab
- Disabled items must be noninteractive and visually distinct

Do not replace this with a modern bottom navigation component.

---

# 13. Status ticker

At the bottom of the main area, create a narrow blue status strip.

Example messages from the references:

- `Parma appoint Smith`
- `Parma appoint Smith as manager`

Styling:

- Medium-to-dark blue gradient
- Inset bevel
- Small cyan text
- Text positioned toward the center or right, depending on available width
- Single-line truncation with ellipsis when necessary

Provide a message queue or prop-based API so the ticker is not hardcoded to one sentence.

---

# 14. Typography

Choose an available font resembling the compact, rounded, slightly playful sans-serif type used by early-2000s football-management games.

Possible fallback strategy:

font-family:
  "Trebuchet MS",
  "Arial Rounded MT Bold",
  Arial,
  sans-serif;

Apply:

- Strong font weight for nearly all labels
- Tight line-height
- Slight text shadow only where necessary for contrast
- Small sizes throughout
- No anti-pattern of using one oversized display font everywhere

Approximate sizes at 1024 × 768:

- Club title: 30 px
- Club subtitle: 16 px
- Panel title: 16 px
- Navigation tabs: 12 px
- Roster names: 16 px in position view
- Contract-table text: 13–14 px
- Position labels: 12–13 px
- Sidebar controls: 12–13 px
- Tiny badges: 8–9 px

Tune sizes by visual comparison rather than enforcing the values blindly.

---

# 15. Color system

Define theme tokens rather than scattering literal colors across components.

Suggested approximate palette:

--color-navy-950: #071329;
--color-navy-900: #0b1e42;
--color-blue-900: #0d2f75;
--color-blue-800: #123b91;
--color-blue-700: #28569a;
--color-blue-600: #4877b2;
--color-steel-500: #6f98bd;
--color-panel-dark: rgba(14, 18, 20, 0.78);
--color-row-a: rgba(49, 47, 41, 0.72);
--color-row-b: rgba(77, 72, 61, 0.55);
--color-yellow: #fff500;
--color-white: #f4f4f4;
--color-cyan: #49d0ff;
--color-orange: #ff8a00;
--color-green: #18a866;
--color-muted: #89929c;
--color-border-dark: #263646;
--color-border-light: #6688a8;

These are starting points. Adjust the final palette against the supplied images.

---

# 16. Bevel and texture rules

Recreate the beveled appearance mainly with CSS:

- Thin light border on the top and left
- Thin dark border on the bottom and right
- Subtle inset highlight
- Restrained linear gradients
- Fine repeating grid or scanline texture at very low opacity

Create a reusable bevel utility or component variant.

Do not:

- Use heavy 3D transforms
- Apply large blurred shadows
- Make every surface glossy
- Allow texture to reduce text readability

---

# 17. Data model

Use a typed player model similar to:

Player

- id
- displayName
- positionCodes[]
- primaryPosition
- squadStatus
- basicWage
- currency
- contractExpiry
- offerOption
- askingPrice
- infoStatus
- displayState
- pickedState
- selectable
- sortOrder

Suggested semantic enums:

InfoStatus

- none
- loaned
- wanted
- listed
- loanAvailable
- goalkeeper
- custom

PlayerDisplayState

- normal
- selected
- linked
- emphasized
- unavailable
- disabled

SquadView

- contract
- positions

Keep displayed strings localized through the project’s localization system.

Do not use a player’s visible name as the React key or record identifier.

---

# 18. State and URL behavior

The selected squad view should be persistent and shareable.

Preferred URL patterns:

- `/squad?view=contract`
- `/squad?view=positions`

Persist these states where appropriate:

- Selected view
- Team filter
- Sort option
- Selected position slots
- Show Filters state
- Scroll position for each view
- Selected player
- Picked players

Switching between views must not discard the selected player or unrelated filters.

Browser backward and forward navigation should restore the correct view.

---

# 19. Required interactions

Implement the following interactions:

1. Change `View`
   - Switches between Contract and Position(s)
   - Reuses the same player collection

2. Change `Sort`
   - Reorders position-view players
   - Does not mutate the source data

3. Change `Team`
   - Filters by first team, reserves, youth, or all, according to available project data

4. Select a player row
   - Updates semantic selected state
   - Supports keyboard selection
   - Preserves selection across views

5. Use a Pkd slot
   - Toggles picked state if the player is selectable
   - Prevents invalid selection where applicable

6. Select a position button
   - Filters or highlights compatible players

7. Toggle Show Filters
   - Shows or hides the extended filter region

8. Scroll contract roster
   - Only the table body scrolls

9. Activate navigation tabs
   - Uses the application router
   - Preserves relevant Squad state when returning

---

# 20. Accessibility

Although the visual design is intentionally retro, preserve modern accessibility.

Required:

- All controls must be reachable by keyboard.
- Use actual buttons for clickable buttons.
- Use semantic table markup for the contract view where possible.
- Provide visible focus indicators that fit the retro style.
- Add accessible names to abbreviated controls.
- Add tooltips or expanded labels for badges such as `Lmp`, `Wnt`, and `Lst`.
- Do not communicate player state only through color.
- Ensure yellow text on blue and white text on dark rows meet readable contrast.
- Respect reduced-motion preferences.
- Use `aria-pressed` for toggleable position and picked controls.
- Use `aria-current` for active navigation tabs.
- Mark disabled tabs properly.

---

# 21. Responsive and overflow behavior

The primary target is a desktop window with a 4:3 aspect ratio.

For different dimensions:

- Preserve the 88:936 relationship between sidebar and main area as closely as practical.
- Prefer scaling the full shell over reflowing it.
- Keep the club header and primary navigation fixed to the main width.
- Allow only the roster body to scroll vertically.
- Allow controlled horizontal scrolling only as a last resort.
- Never hide required table columns without an explicit compact-mode design.
- Never collapse the sidebar into a hamburger menu in the principal reference mode.

---

# 22. Implementation quality

Follow the project’s existing architecture and naming conventions.

Requirements:

- Reuse existing primitives where they can achieve the reference appearance.
- Keep Squad-specific styling encapsulated.
- Avoid a single monolithic component.
- Avoid duplicating player-row logic across the two roster views.
- Memoize derived filtering and sorting where justified.
- Keep sorting pure and stable.
- Parse and compare contract dates as dates, not formatted strings.
- Compare wages and prices as numeric values, not display strings.
- Format currencies and dates only at the presentation boundary.
- Avoid layout shifts when changing views.
- Do not hardcode the roster directly inside rendering markup.

---

# 23. Testing requirements

Add tests for:

## Unit tests

- Position group ordering
- Stable player sorting
- Team filtering
- Position filtering
- Wage and price sorting
- Contract-expiry sorting
- Two-column distribution
- View-state serialization
- Player display-state mapping
- Position-slot compatibility

## Component tests

- Contract view renders all required headers
- Position view renders two roster columns
- View dropdown switches content
- Sort dropdown changes player order
- Team dropdown filters players
- Position button updates pressed state
- Selected player remains selected after switching views
- Disabled bottom tab cannot be activated
- Keyboard selection works
- Show Filters toggles the filter region

## Visual regression tests

Capture at least:

- 1024 × 768 contract view
- 1024 × 768 position view
- Contract view with scrollbar at top
- Contract view with scrollbar at a middle position
- Selected player state
- Active position filter state
- Open dropdown state
- Disabled navigation state

Visual tests should compare structure and geometry, not require pixel-perfect reproduction of an unavailable proprietary background photograph.

---

# 24. Visual acceptance checklist

The implementation is complete only when all of the following are true:

- The page clearly reads as one Squad screen with two switchable views.
- The left rail remains visible in both views.
- The Parma header has the same visual dominance as the reference.
- The six primary tabs align in a single compact row.
- The active Squad tab uses yellow text.
- The toolbar controls are compact and aligned.
- The central panel uses a dim football background without compromising readability.
- Contract view contains all eight visible columns.
- Contract rows are dense and fit roughly 19–20 players in the visible region.
- Position view contains two balanced columns.
- Position abbreviations are bright yellow and right aligned.
- The center divider is visible but subtle.
- Status badges are circular and compact.
- Pkd slots resemble pale blue beveled rectangles.
- Player-name color states match semantic states.
- The Positions panel is shared by both views.
- All referenced position-slot buttons fit on one line at 1024 px.
- The bottom five-tab row is present.
- The status ticker is present.
- No part of the interface looks like a modern SaaS dashboard.
- There are no decorative elements unsupported by the references.
- The screen remains usable with keyboard navigation.
- Both views use the same player data and selection state.

---

# 25. Recommended execution sequence

Implement in this order:

1. Inspect the current project architecture, styling system, router, data models, and existing shared controls.
2. Identify reusable shell and navigation components.
3. Build the fixed 1024 × 768 reference layout.
4. Implement theme tokens, bevel utilities, and subtle textures.
5. Implement the shared sidebar, header, primary tabs, bottom tabs, and ticker.
6. Define or adapt the typed player data model.
7. Implement ContractView with semantic table behavior.
8. Implement PositionView using the same player records.
9. Implement shared Pkd controls and status badges.
10. Implement dropdown state, sorting, filtering, and URL persistence.
11. Add the position selector.
12. Add keyboard and accessibility behavior.
13. Add tests.
14. Capture visual-regression screenshots.
15. Compare the result side by side with both supplied references.
16. Correct geometry first, then typography, colors, spacing, and fine texture.
17. Report all validation commands and results.

Do not stop after producing a rough approximation. Complete the interactions, tests, responsive behavior, and validation.

---

# 26. Delivery report

At completion, provide:

- Summary of the implementation
- Files created
- Files modified
- Architectural decisions
- Player-data assumptions
- Asset substitutions
- Validation commands executed
- Unit-test results
- Component-test results
- Build/type-check results
- Visual-regression captures
- Known differences from the references
- Suggested Conventional Commit message
