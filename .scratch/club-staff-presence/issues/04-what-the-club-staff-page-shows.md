# 04: What the Club Staff page shows

Type: prototype
Blocked by: 02, 03
Status: open

## Question

The page is the reader that justifies the whole effort, so what it shows is the thing the binding
rule is now resting on. Import screen 38 asks for filters by department, contracts, workload,
availability, vacancies, responsibilities, staff search, and eight view states. This repo has none
of those and will ship none of them. What survives is a read-only list of four named people grouped
by department.

Build a rough prototype and settle against it:

- **The layout.** Four departments each holding one or more people, for a club that may or may not
  be yours. Whether department grouping earns its keep when three of the four hold exactly one
  person.
- **What a row carries.** Name and role is the floor. Whether a bound person shows anything a
  presence person cannot — a Coach has a quality the game reads, and showing it would make two rows
  on one page mean different amounts of thing.
- **The states that survive.** `loading`, `ready`, and `error` have referents. `permission_limited`,
  `refreshing`, `filtered_empty`, and `unavailable` mostly do not, and each should be either mapped
  onto something real or dropped on the record.
- **Whose club, said out loud.** The page must make it obvious you are looking at North United and
  not your own club, because every other screen in this app is implicitly yours.
- **Keyboard and screen reader.** This repo's screens are keyboard-first and the list is the whole
  page, so the reading order and the region labelling are the design, not a finishing pass.

Link the prototype from this ticket rather than pasting it in.
