# What "archived" means to downstream readers and tools

Type: grilling
Status: open

Blocked by: None

## Question

Once an effort sits in `.scratch/archived/<effort>/`, what is true of it?

**Freeze.** Archived Agent Notes are frozen by convention: never edited, moved, or reformatted again,
with only an `Archived: YYYY-MM-DD` line inserted. Does the same freeze apply to an archived effort —
and if so, to the whole directory or only the map? An archived effort is a directory of many files,
not a single note, and `cm-clone`'s spec is still cited as live authority, which sits awkwardly with
"never edit again". Is there a marker file or a header line recording the archival date and why?

**Tool exclusion.** `.scratch/archived/` sits inside the directory that frontier scans glob as
`.scratch/<effort>/`, so it reads as an effort named "archived" unless every scan excludes it. Which
consumers need to change — `cm-wayfinder`, `cm-to-tickets`, `effect-v4-migration`, `code-review`'s
spec discovery, `resolve-ticket.ts`'s roadmap warning — and is exclusion a convention each one
restates, or one rule stated once that they all reference?

**Roadmap.** [docs/roadmap.md](../../../docs/roadmap.md) is a derived point-in-time index over
`.scratch/`, with a "Shipped" section already listing efforts that this skill would archive. Does an
archived effort stay listed under "Shipped" with a repathed link, drop off the roadmap entirely on
the grounds that the roadmap tracks live work, or move to an "Archived" section? And does the skill
update the roadmap as part of archiving, or leave it to drift as the file's own preamble already
warns it does?
