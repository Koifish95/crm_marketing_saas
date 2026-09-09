Before we continue implementing application functionality, I want to establish the project's documentation and knowledge-management structure.

The skeleton application is now running successfully. Do not begin the next application milestone yet. This task is documentation/infrastructure only.

I have created:

vault/
vault/wip/

## Purpose of `vault/`

`vault/` will be the project's persistent knowledge base and documentation system.

As this application grows, I do not want you repeatedly scanning the entire repository to reconstruct architectural decisions, business requirements, implementation history, or current priorities.

Instead, we are going to maintain high-quality project documentation that both you and I can reference deliberately.

The intended workflow is:

1. Read the relevant documentation.
2. Inspect only the relevant portions of the codebase.
3. Perform the requested work.
4. Update the documentation to reflect meaningful changes.
5. Keep documentation synchronized with the actual implementation.

The documentation should become the primary map of the project, while the source code remains the authoritative implementation.

Do not treat documentation as a substitute for verifying code when implementation details matter.

---

# `vault/wip/`

`vault/wip/` is our working communication area.

This is where I may place:

- large prompts
- new business information
- requirements from stakeholders
- questions for you
- answers to questions you asked me
- design discussions
- implementation instructions
- temporary research
- documents such as `v1-questions.md`
- information that has not yet been incorporated into the permanent project documentation

Treat files in `vault/wip/` as potentially temporary or unprocessed.

When a WIP document contains durable information, incorporate that information into the appropriate permanent documentation rather than forcing future work to repeatedly rediscover it from WIP.

Do not automatically delete WIP files after processing them.

---

# Permanent documentation

Everything directly under `vault/`, or within organized permanent subfolders you create beneath `vault/`, should represent durable project knowledge.

You may design the permanent documentation structure however you think is most maintainable.

I expect documentation to eventually cover areas such as:

- project overview
- business requirements
- architecture
- domain model
- technical decisions
- development milestones
- current implementation state
- external integrations
- Meta integration
- lead acquisition workflow
- scheduling workflow
- deployment
- database
- security/authentication
- testing
- operational procedures
- unresolved questions
- decision history

Do NOT create empty documentation files for every possible future topic simply to satisfy this list.

Create documentation that is useful for the project as it exists today, and expand the structure organically as the project grows.

---

# Obsidian compatibility

The entire `vault/` directory should function cleanly as an Obsidian vault.

Use Obsidian-friendly Markdown.

Take advantage of useful Obsidian capabilities where appropriate, including:

- `[[Wiki Links]]`
- tags
- YAML frontmatter/properties
- backlinks through deliberate linking
- headings
- aliases where useful
- embedded references where appropriate
- navigational/index notes
- queries if supported by the chosen approach

The vault must remain understandable as ordinary Markdown even without Obsidian.

Do not make critical project knowledge dependent exclusively on a third-party Obsidian plugin.

If you use syntax requiring a community plugin, document that dependency clearly.

---

# Documentation navigation

Create a clear entry point for the vault.

For example:

`vault/Home.md`

or an equivalent name you consider better.

Someone opening the vault for the first time should quickly be able to answer:

- What is this project?
- What are we building?
- Why are we building it?
- What is implemented now?
- What are we working on next?
- What major decisions have already been made?
- Where do I find more detailed information?

Use links rather than duplicating large amounts of information across documents.

---

# Documentation metadata

Establish a consistent frontmatter/property convention for permanent documentation.

Use only metadata that provides actual value.

Potential examples include:

type
status
area
tags
created
updated

Do not add meaningless metadata merely for completeness.

Define the convention somewhere in the vault so future documents follow the same pattern.

---

# Decisions

I want architectural and important implementation decisions preserved.

Establish a lightweight way to record decisions so that six months from now we can answer questions such as:

"Why is Trial a separate entity from Lead?"

"Why did we choose SQLite initially?"

"Why are Meta integrations isolated from the core acquisition domain?"

"Why did we prioritize scheduling over content management?"

This can be an ADR-style structure or another approach you consider appropriate.

Keep it lightweight.

---

# `ToDo.md`

Create:

`vault/ToDo.md`

This should function as a centralized navigation surface for outstanding work.

IMPORTANT:

I do NOT want `ToDo.md` to become another manually maintained list containing duplicated task descriptions.

The authoritative task/action information should live in the relevant documentation throughout the vault.

`ToDo.md` should aggregate or reference that information.

Prefer an Obsidian-native approach.

For example, relevant documents may contain actionable tasks such as:

- [ ] Confirm Meta Business Suite configuration
- [ ] Determine current intro scheduling process

`ToDo.md` should surface those outstanding tasks through queries or references rather than requiring us to manually copy the same task into two places.

If this requires an Obsidian community plugin such as Dataview or Tasks, evaluate the options and choose the simplest maintainable approach.

If you choose a plugin-dependent approach:

1. document the required plugin
2. explain why it was selected
3. ensure the underlying Markdown remains human-readable without the plugin

Each surfaced task should make it easy to navigate back to the source document and relevant context.

---

# Current project knowledge

Before designing the permanent documentation, read the project information I have already placed in the repository, including the new material in `vault/wip/`.

Also inspect the existing README and current skeleton application only as necessary to accurately document the current implementation state.

Use the existing project materials as the source for business requirements and prior decisions.

Do not invent missing business requirements.

Clearly represent unresolved items as unresolved.

---

# Documentation maintenance rules

From this point forward, treat documentation maintenance as part of implementation.

When future work materially changes:

- architecture
- database/domain model
- business rules
- integrations
- configuration
- deployment
- development workflow
- milestone status
- important assumptions
- known limitations

update the appropriate vault documentation as part of that work.

Avoid documenting trivial implementation details that are obvious from the code.

The goal is not maximum documentation.

The goal is a reliable project knowledge base that prevents repeated rediscovery.

---

# This task

For this task only:

1. Review the existing project documentation and relevant WIP material.
2. Design the vault structure.
3. Create the initial permanent documentation.
4. Create the vault entry/navigation page.
5. Establish the metadata/tagging/linking conventions.
6. Establish the decision-recording approach.
7. Create `ToDo.md` using the aggregation/reference approach described above.
8. Document any Obsidian plugin requirements.
9. Document the current state of the running skeleton application.
10. Incorporate durable information from WIP into the appropriate permanent documentation.

Do not implement new application functionality.

Do not begin M1 or another development milestone.

Do not delete or substantially rewrite the source WIP documents.

When finished, report:

1. the vault structure you created
2. each permanent document created
3. what information was incorporated from WIP
4. the Obsidian conventions established
5. how `ToDo.md` works
6. any plugin dependencies
7. any contradictions or unclear requirements you discovered
8. any documentation gaps that require my input

Create a new .md file within wip for this report.

Then STOP for review.