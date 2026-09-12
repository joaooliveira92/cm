# Redesigned Navbar Implementation Guide

## Purpose

This document specifies how to design and implement a **redesigned navbar**.

> **Reference boundary:** reproduce the interaction model and information architecture, not Football Manager branding, logos, proprietary artwork, exact copy, or pixel-identical styling. Use original names, icons, colors, spacing, and visual assets for your game.

## Source observations

The reference presents a horizontal navbar at the top of the interface as the replacement for the traditional vertical sidebar. Its purpose is to centralize the manager's main areas of responsibility and shorten access to frequently used screens. The navbar exposes deeper navigation through contextual submenus when the user moves over a section. The broader interface also uses bookmarks to keep frequently used features close at hand. [1][2]

The implementation below translates those observations into a production-ready interaction specification. Details not explicitly shown in the reference, such as keyboard behavior, responsive rules, state models, and test cases, are recommended design decisions for this project rather than claims about the original game.

---

## 1. Product goals

The navbar should:

1. Make every major management domain reachable in one action.
2. Preserve access to deep screens without permanently displaying a large sidebar.
3. Show the user's current location at both section and subsection level.
4. Support fast switching among high-frequency workflows.
5. Allow users to pin favorite destinations as bookmarks.
6. Remain usable with mouse, keyboard, controller, and reduced-motion settings.
7. Scale from laptop resolutions to ultrawide displays without losing critical actions.
8. Feel dense and professional while avoiding visual clutter.

### Non-goals

- Do not place every game screen directly in the top row.
- Do not turn the navbar into a dashboard with live match data.
- Do not rely on hover as the only way to open a submenu.
- Do not mix navigation, destructive actions, and simulation controls without clear separation.
- Do not copy Football Manager's protected visual identity.

---

## 2. Recommended information architecture

Use seven primary regions. Rename them to fit your game's terminology.

1. **Home / Portal**
   - Overview
   - Inbox
   - Calendar
   - News
   - Tasks

2. **Squad**
   - Players
   - Selection
   - Dynamics
   - Development
   - Medical center
   - Staff responsibilities

3. **Tactics**
   - Formation
   - In possession
   - Out of possession
   - Set pieces
   - Match plans
   - Opposition instructions

4. **Training**
   - Calendar
   - Units
   - Individual training
   - Mentoring
   - Rest
   - Performance review

5. **Recruitment**
   - Scouting center
   - Player search
   - Shortlist
   - Assignments
   - Transfers
   - Contract planning

6. **Analysis**
   - Data hub
   - Team performance
   - Player performance
   - Opposition analysis
   - Reports

7. **Club**
   - Competitions
   - Finances
   - Facilities
   - Staff
   - Board
   - History

Keep the primary row stable. Contextual or save-specific destinations belong in submenus, bookmarks, or page content rather than being added as new primary sections.

---

## 3. Navbar anatomy

Organize the component into three horizontal zones.

### 3.1 Left zone: identity and global navigation

- Original game logo or compact monogram
- Portal button
- Back and forward history controls
- Optional breadcrumb trigger

The Portal button should always return to the main management hub. Back and forward controls should use the application's navigation history, not the browser history if the game runs inside Electron.

### 3.2 Center zone: primary sections

Each primary item contains:

- An icon
- A short text label
- Active-state indicator
- Submenu affordance when children exist
- Optional attention marker for exceptional states

The center zone owns the core interaction described by the reference: moving over or activating a section reveals its contextual submenu close to the selected item. [1][2]

### 3.3 Right zone: personal and time-sensitive actions

Recommended order:

- Bookmarks
- Global search
- Inbox or notifications
- Help / knowledge base
- Continue or Advance button
- User or manager profile

Make **Continue** visually dominant but spatially separate from ordinary navigation. It advances game time and is therefore an action, not a destination.

---

## 4. Layered layout

Use a two-layer model:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Logo  Back  Portal | Squad Tactics Training Recruitment ... | Search ▶   │
├──────────────────────────────────────────────────────────────────────────┤
│ Context submenu: Players | Selection | Dynamics | Development | Medical  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Primary bar

- Suggested desktop height: `56px`
- Minimum target size: `40px`
- Horizontal padding: `12px` to `20px`
- Use a solid or lightly translucent surface with reliable contrast
- Maintain a clear bottom border or shadow over scrolling content

### Context submenu

Choose one of these patterns:

- **Persistent contextual strip:** visible for the active section. Best for desktop and controller use.
- **Anchored popover:** opens beneath the primary item. Best when vertical space is constrained.
- **Hybrid:** persistent active-section strip plus a richer hover/focus preview for other sections. This is the recommended pattern.

The hybrid pattern lets users see where they are while previewing another domain without immediately navigating away.

---

## 5. Interaction contract

### 5.1 Pointer behavior

- Hovering a primary item starts a `150-250ms` intent delay.
- After the delay, show that item's submenu preview.
- Moving diagonally from the item toward its submenu must not close the submenu.
- Leaving both trigger and submenu starts a `250-400ms` close delay.
- Clicking the primary label navigates to the remembered default route for that section.
- Clicking the chevron only toggles the submenu.
- Clicking a submenu entry navigates and closes transient previews.

The delays prevent accidental menu flashing as the pointer crosses the bar.

### 5.2 Keyboard behavior

- `Tab` enters and leaves the navbar.
- Left and right arrows move among primary sections.
- Down arrow or `Enter` opens the focused submenu.
- Left and right arrows move among submenu entries when the submenu is a horizontal strip.
- Up arrow returns focus to the primary item.
- `Escape` closes a transient submenu and restores focus to its trigger.
- `Home` and `End` move to the first and last item in the current navigation level.

Use the WAI-ARIA menubar pattern only if the component truly behaves like an application menu. For a website-like router, ordinary links with a disclosure button often produce simpler and more reliable semantics.

### 5.3 Controller behavior

- Left stick or D-pad moves focus.
- Confirm opens or activates.
- Cancel closes the submenu or returns to main content.
- Shoulder buttons may switch primary domains, but only after onboarding exposes the shortcut.
- Never make pointer hover the only access route.

### 5.4 Touch behavior

- First tap on a section opens its submenu.
- Second tap on the section label navigates to its default destination.
- Tapping outside closes a transient submenu.
- Do not use targets smaller than `44px` on touch layouts.

---

## 6. Navigation state model

Keep route state, preview state, and focus state separate.

```ts
type NavState = {
  activeSectionId: string;
  activeItemId: string | null;
  previewSectionId: string | null;
  openSectionId: string | null;
  focusedItemId: string | null;
  lastRouteBySection: Record<string, string>;
};
```

### State rules

1. The URL or application route is the source of truth for `activeSectionId` and `activeItemId`.
2. Hover changes `previewSectionId`, never the current route.
3. Click, keyboard activation, or controller confirmation changes the route.
4. The active indicator must not move merely because another section is previewed.
5. When a route is opened from search, bookmarks, or notifications, derive its owning section from route metadata.
6. Store the last visited valid route for each section, then use it as that section's default destination.
7. Clear preview state after navigation, focus loss, window blur, or route transition.

This separation prevents a common bug where hovering over another section makes the current page appear to have changed.

---

## 7. Data-driven configuration

Do not hardcode menu markup into the component. Define navigation as validated data.

```ts
type NavItem = {
  id: string;
  labelKey: string;
  route: string;
  icon: IconName;
  capability?: string;
  badgeSelector?: string;
};

type NavSection = {
  id: string;
  labelKey: string;
  icon: IconName;
  defaultRoute: string;
  items: readonly NavItem[];
};
```

Example:

```ts
export const NAV_SECTIONS = [
  {
    id: "squad",
    labelKey: "nav.squad",
    icon: "users",
    defaultRoute: "/squad/players",
    items: [
      {
        id: "players",
        labelKey: "nav.squad.players",
        route: "/squad/players",
        icon: "user-list",
      },
      {
        id: "development",
        labelKey: "nav.squad.development",
        route: "/squad/development",
        icon: "trend-up",
      },
    ],
  },
] as const satisfies readonly NavSection[];
```

Validate this configuration at startup. Reject duplicate IDs, duplicate routes, missing translations, inaccessible capabilities, and sections with invalid default routes.

---

## 8. Suggested component architecture

```text
NavbarRoot
├── NavbarIdentity
├── NavigationHistoryControls
├── PrimaryNav
│   └── PrimaryNavItem × N
├── ContextNav
│   └── ContextNavItem × N
├── BookmarkLauncher
├── GlobalSearchTrigger
├── NotificationTrigger
├── ContinueAction
└── ManagerMenu
```

Supporting modules:

```text
navigation/
├── nav-config.ts
├── nav-schema.ts
├── nav-route-index.ts
├── use-nav-state.ts
├── use-hover-intent.ts
├── use-roving-focus.ts
├── use-navigation-history.ts
├── navbar.telemetry.ts
└── components/
```

Keep domain logic out of visual components. The navbar should consume permissions, badges, and pending-action counts through selectors or application services.

---

## 9. Visual design system

Create an original token set rather than copying the source interface.

```css
:root {
  --nav-bg: #101720;
  --nav-surface: #17212d;
  --nav-surface-hover: #213043;
  --nav-text: #f4f7fa;
  --nav-text-muted: #aebdca;
  --nav-accent: #5ee6a8;
  --nav-danger: #ff6b72;
  --nav-border: rgb(255 255 255 / 10%);
  --nav-focus: #8dc8ff;
  --nav-radius: 8px;
  --nav-primary-height: 56px;
  --nav-context-height: 44px;
  --nav-motion-fast: 140ms;
}
```

### Active state

Use at least two cues:

- Text or icon color change
- Bottom indicator, filled surface, or high-contrast border

Do not rely on color alone. Consider a `2-3px` bottom bar and `aria-current="page"` on the active destination.

### Attention indicators

- Use a dot for new but non-urgent content.
- Use a count only when the number is meaningful.
- Use a warning treatment only for time-sensitive problems.
- Cap large counts, for example `99+`.
- Do not animate continuously.

### Motion

- Fade and translate the submenu by no more than `4-8px`.
- Keep transitions near `120-180ms`.
- Disable nonessential motion under `prefers-reduced-motion: reduce`.
- Do not animate the active indicator across unrelated page transitions if it causes ambiguity.

---

## 10. Bookmarks

The reference describes bookmarks as a way to customize the management workspace and keep frequently used features within easy reach. [1][2]

Implement bookmarks as user-owned route references:

```ts
type Bookmark = {
  id: string;
  route: string;
  labelOverride?: string;
  order: number;
  createdAt: string;
};
```

Required behavior:

- Add or remove the current page.
- Reorder bookmarks.
- Open from a compact launcher in the right zone.
- Show the original section icon alongside each bookmark.
- Remove or migrate bookmarks whose routes no longer exist.
- Persist per save or per user, based on the game's account model.
- Provide a sensible maximum, such as 8 to 12 entries.

Bookmarks should point to stable route identifiers, not localized labels.

---

## 11. Responsive behavior

### Wide desktop, `>= 1440px`

- Show icons and labels for all primary items.
- Show persistent contextual strip.
- Show all right-zone controls.

### Standard desktop, `1024-1439px`

- Reduce horizontal gaps.
- Hide labels for low-priority utility icons.
- Move optional items into an overflow menu.
- Keep primary domain labels visible when possible.

### Compact, `768-1023px`

- Use icon plus tooltip for some primary sections.
- Convert contextual strip into anchored popover.
- Move bookmarks and help into overflow.
- Keep Portal, Search, Notifications, and Continue directly accessible.

### Narrow, `< 768px`

- Replace the full navbar with a compact top app bar and explicit navigation drawer or sheet.
- Do not squeeze seven sections into an unusable row.
- Preserve the same route hierarchy and state model.

Test at `1280×720`, because management games often run on modest laptop displays.

---

## 12. Accessibility requirements

- All destinations must be real links where the runtime supports links.
- Every icon-only control needs an accessible name and tooltip.
- Use `aria-current="page"` for the active destination.
- Associate disclosure controls with submenu containers using `aria-expanded` and `aria-controls`.
- Keep focus visible against every background state.
- Maintain WCAG AA contrast for text and interactive states.
- Announce route changes through the page title and main heading, not through noisy live regions.
- Do not automatically move focus after pointer navigation.
- After keyboard navigation, move focus to the new page's main heading only if the routing convention uses managed focus consistently.
- Support text expansion of at least 30 percent for localization.
- Test screen-reader output with submenu open and closed.

---

## 13. Electron-specific security boundary

If the clone is an Electron application:

- Keep route configuration and rendering in the renderer.
- Do not expose filesystem, process, or shell APIs to the navbar.
- Request game-time advancement through a narrow, validated preload capability.
- Validate every IPC payload with a runtime schema.
- Do not pass arbitrary route strings to privileged processes.
- Ensure the Continue action is idempotent while a simulation request is pending.
- Disable repeat activation and show progress during time advancement.
- Support cancellation with `AbortSignal` where the simulation operation permits it.

Example capability shape:

```ts
type GameClockCapability = {
  advance: (
    request: AdvanceRequest,
    signal?: AbortSignal,
  ) => Promise<AdvanceResult>;
};
```

The renderer should receive only the capability required for the action, never a generic IPC bridge.

---

## 14. Performance guidance

- Render the navbar shell immediately during application startup.
- Lazy-load heavyweight submenu content, but not basic labels and icons.
- Memoize route-to-section lookup with a prebuilt index.
- Subscribe badges to narrow selectors to avoid rerendering the entire navbar.
- Avoid measuring every item on every frame.
- Use CSS for simple transitions.
- Prefetch a section's common destination after hover intent, not on every pointer pass.
- Cancel stale prefetch requests when the preview changes.

Performance targets:

- Input response under `100ms` in typical use.
- Submenu visible within one frame after the hover-intent timer expires.
- No layout shift when badges appear.
- No duplicate navigation or game-time commands under rapid clicks.

---

## 15. Telemetry

Capture behavior without collecting sensitive save content.

Recommended events:

```text
navbar_section_previewed
navbar_section_opened
navbar_destination_opened
navbar_bookmark_opened
navbar_overflow_opened
navbar_continue_requested
navbar_continue_completed
navbar_continue_failed
```

Useful properties:

- Section and destination IDs
- Input method: pointer, keyboard, controller, touch
- Source: primary, contextual, bookmark, search
- Duration from menu open to destination activation
- Viewport category

Do not log player names, club names, search queries, message contents, or save identifiers unless there is an explicit and lawful analytics requirement.

---

## 16. Test plan

### Unit tests

- Route correctly maps to active section and item.
- Duplicate routes and IDs fail configuration validation.
- Permission filtering never leaves an invalid default route.
- Last route by section is updated only after successful navigation.
- Hover preview does not alter active route state.
- Bookmark migration handles missing destinations.

### Component tests

- Hover intent opens the expected submenu after the delay.
- Fast pointer transit does not open unintended menus.
- Clicking outside closes transient menus.
- `Escape` closes and restores focus.
- Arrow-key navigation wraps or stops according to the documented rule.
- Active elements expose `aria-current`.
- Disclosure state exposes `aria-expanded`.
- Continue cannot be submitted twice while pending.

### Integration tests

- Deep links initialize both primary and contextual active states.
- Browser or application back and forward controls remain synchronized.
- Search and bookmarks activate the correct owning section.
- Capability changes update visibility without corrupting focus.
- Localization does not cause overlap or inaccessible overflow.

### End-to-end scenarios

1. Start at Portal, open Tactics by keyboard, select Set Pieces, and verify focus and route state.
2. Preview Recruitment with the pointer, leave the menu, and verify that Squad remains active.
3. Bookmark a player-development screen, restart, and open it from the bookmark launcher.
4. Trigger Continue twice rapidly and verify only one simulation request is accepted.
5. Resize from ultrawide to laptop width and verify destinations remain reachable.
6. Navigate the entire navbar using a controller with no pointer input.
7. Enable reduced motion and verify no unnecessary submenu movement occurs.

---

## 17. Implementation sequence

### Phase 1: foundation

1. Inventory all routes and assign each one to a primary section.
2. Create the validated navigation schema and route index.
3. Implement route-derived active state.
4. Build the static three-zone shell.
5. Add primary and contextual navigation using real links.

### Phase 2: interaction

1. Add hover intent and close tolerance.
2. Add roving keyboard focus.
3. Add controller mapping.
4. Add navigation history controls.
5. Add responsive overflow behavior.

### Phase 3: personalization and status

1. Add bookmarks and persistence.
2. Add badges through narrow selectors.
3. Add global search entry point.
4. Integrate notifications.
5. Add Continue with pending, success, error, and cancellation states.

### Phase 4: quality

1. Run accessibility checks.
2. Test target resolutions and localization expansion.
3. Add unit, component, integration, and E2E coverage.
4. Instrument telemetry.
5. Profile rerenders and interaction latency.
6. Document final interaction decisions in an ADR.

---

## 18. Definition of done

The redesigned navbar is complete when:

- Every main screen belongs to exactly one primary section.
- Deep links always produce correct active states.
- Primary and contextual navigation work with pointer, keyboard, controller, and touch rules.
- Hover previews never change the active route.
- Bookmarks survive reload and invalid entries are handled safely.
- Continue cannot issue duplicate game-time requests.
- The layout remains usable at `1280×720` and on ultrawide displays.
- All controls have visible focus and accessible names.
- Reduced motion and localization expansion are verified.
- Automated tests cover the critical paths listed above.
- No proprietary Football Manager branding or copied visual assets are included.

---

## 19. Recommended acceptance checklist

```text
[ ] Primary sections match the game's actual management workflows
[ ] Route metadata drives active section and submenu
[ ] Persistent state and hover-preview state are independent
[ ] Submenu supports delayed open and tolerant close behavior
[ ] Keyboard and controller navigation are complete
[ ] Current page is exposed with aria-current
[ ] Focus treatment meets contrast requirements
[ ] Responsive overflow preserves all destinations
[ ] Bookmarks use stable route IDs
[ ] Continue has pending and duplicate-request protection
[ ] Electron IPC is narrow and runtime-validated
[ ] Navigation analytics exclude save content and personal data
[ ] Unit, component, integration, and E2E tests pass
[ ] Original brand tokens and visual assets are used
```
