# Agent Note: The player name is the way into the player screen

Status: implemented

## Problem

Group D shipped a Player Profile screen, a Player Contract screen and a Player Development screen,
each on its own route under `/career/$saveId/player/$playerId/...`, and then left them unreachable.
Ticket 06 promised the profile would be "accessible from any player row (squad table, league table,
transfers table, competition squad)"; nothing wired it. The only entry point in the codebase was the
Team Scout Report's key-player list. From the Squad screen — the screen a career opens on, and the
one that lists every player by name — a player's name did nothing but toggle a row highlight.

The three screens were also three unrelated pages. Each drew its own `<h1>` with the player's name
spelled differently ("Rui Costa", "Rui Costa — Development"), and none of them said what else there
was to read about that player. CM 03/04 drew one player screen with a fixed identity banner and a
tab strip, and switched only the body.

## Decision

**A player's name opens their player screen.** In the Squad screen's two layouts — the position list
and the table — the name button's click navigates to `player/$playerId/profile`, and the row's
primary action (Enter) does the same. Selection stays on Space, where it already was.

**The three player routes share one frame.** `player/PlayerScreenFrame.tsx` owns the player's
identity and the tab strip across Profile, Information and Development. The identity is not drawn
on the page: the frame publishes it through `screenIdentity.ts`, and the career navbar shows it in
place of the club name — "Florian David (Benfica)", the position / nationality / age line beneath —
while the band under the navbar swaps the calendar and standing for Rating, Value, Wage, Contract
and Injury. Leaving the player screen hands both back to the club. It also owns the profile read's loading and error arms, so a screen
inside it is typed against a loaded `PlayerProfileView` and renders panels only.

**The panels are CM's, over the data this game models.** Profile draws one column per Attribute
Category with every Attribute in it — Goalkeeping absent, not zeroed, for an outfield player — with
Overall Rating and Transfer Value tinted at the foot of the last column the way CM set its derived
readings apart. Information is Overview plus Contract Details, the tab CM gave that name.

**Form and History get no tab.** Per-player match form and career history are unmodelled and were
disposed `out-of-scope` and `deferred` by Group D ticket 04. A disabled tab would name a screen that
cannot exist; an absent one leaves the strip honest.

## Alternatives considered

**Leave click on selection and open the player on double-click.** This is closer to CM, which
selected on a single click. Rejected: nothing downstream reads squad selection — it paints a row and
is cleared when the row filters out — so a click spent on it buys nothing, and the request was
explicitly for a single click on the name.

**Change the identity button's click for every `DataTable`.** Rejected. The transfer market's rows
select to feed the bid form, and an identity cell that navigated away mid-bid would break it. The
behaviour is opt-in through `onIdentityOpen` on the table, absent by default.

**Rename the `contract` route to `information` to match its tab label.** Rejected for now as churn:
the path, the screen id, the RPC and the keyboard spine all spell `contract`, and the label is the
only place CM's word for the tab belongs. Worth revisiting if a second contract surface appears.

## Consequences

- Clicking a squad player's name no longer selects that row. `Space` is now the only way to select
  one, and two specs that used a click to arrange a selection were moved onto it.
- The squad's row-primary action changed meaning: it opened nothing before (it committed selection),
  and now it opens the player. Nothing else dispatched it.
- Every future player-scoped surface should mount inside `PlayerScreenFrame` and add its tab there,
  rather than growing another standalone page with its own header.
