# 04: `react/todo` — resolve the compiler Todo-diagnostic sites

Type: task
Status: ready-for-agent

## Bucket

`react/todo` — 19 findings, `warn` in `.oxlintrc.json`.

## What it flags

Constructs the React Compiler accepts but only partially understands — the compiler emits a
"Todo" diagnostic for them, meaning they are in the port's unfinished-todo space rather than
memorized correctly. The oxc port centralises these as `Todo` diagnostics (57 constructors in
the vendored `oxc_react_compiler`).

## Exit criteria

- `react/todo` graduates from `warn` to `error` in `.oxlintrc.json`, or the sites are confirmed
  as compiler-side TODOs we accept and the rule is documented as `warn` with that reasoning.