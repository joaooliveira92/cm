# Issue: Save management edge cases

Type: grilling
Status: open

## Question

What e2e coverage do we add for the landing screen's save management edge cases? The landing screen has a save-name input + "Create" button, plus a "Continue career" list of existing saves. What do we test?

- Empty save name: does the UI reject it? How? (toast, disabled button, inline error?)
- Duplicate save name: does the UI reject it? What error message?
- Loading a nonexistent save: can the user even reach this? (Is the list populated from `listSaves`, so only existing saves are clickable?)
- Interaction matrix: do we add these to an existing smoke test or a new file?
- Do we need a dedicated seed, or does the `fresh` seed suffice?