# 19: The Form tab: recent games and the form strip

**What to build:** Every player gets a Form tab after Information. A Team selector lists the clubs he
has lines for this season, defaulting to his current club. For that club, one row per played fixture
this season from the later of season start and the day he joined, newest first: date, opponent with
"(a)" away, card, substitution note, Key, Off, Fou, Ast, She, Sat, Rat, Gls (Sav for goalkeepers).
Rows read "Not selected", "Unused substitute" or "No player record" when those apply. A row for the
user's own fixture opens its Match Report. Above, "Form: 7 8 8 7 7" shows his last five appearance
ratings, rounded; "Form: no appearances" when none. No knowledge gate. Defined in
[09](09-the-form-tab.md).

**Blocked by:** 13, 18

**Status:** ready-for-agent

- [ ] The three non-appearance states render as distinct text.
- [ ] A player signed mid-season has no rows for his new club before his transfer date.
- [ ] The form strip matches the ratings of his last five appearances across clubs.
- [ ] The player strip's comment and Group D ticket 04's screen-53 row point at this effort.
