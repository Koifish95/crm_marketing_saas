---
type: index
status: current
area: process
updated: 2026-08-26
tags:
  - moc
  - todo
---

# To Do

This page does **not** own tasks. Incomplete checkboxes live in the notes that explain them. Click a file name in the list below to open that context.

Requires [[Plugins|Dataview]]. Without it, search the vault for `- [ ]` (ignore `wip/`).

```dataview
TASK
FROM -"wip"
WHERE !completed
GROUP BY file.link
```

If Dataview shows nothing, either all boxes are checked or the plugin is off — the Renzo source lists are [[Milestones]] and [[Open-Questions]]. Platform tasks: [[SaaS-ToDo]].
