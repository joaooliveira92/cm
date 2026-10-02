# 08: Highlight levels

Spec: [spec.md](../spec.md)

**What to build:** after Championship Manager's event priority, each section sets `level = key`,
`extended` or `full`. A renderer preference (Key, Extended, Full highlights) shows in the bar only the lines
at or above it; the rest are revealed at once, like quiet lines, and stay in the log.

**Acceptance:** at Key highlights, only key lines reach the bar and the others take no time; moments that
change the match are always `key`.

**Blocked by:** 01, 02

**Status:** ready-for-agent
