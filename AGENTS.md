<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/001-cartola-league-tracker/plan.md`
<!-- SPECKIT END -->

## Project phase guard

Before changing code in this project, read `docs/project-phase-guide.md`.

The group phase is complete and frozen. Do not modify behavior, visuals, routes,
services, standings, rounds, matches, lineup display, navigation, or shared
components in a way that affects the group phase unless the user explicitly asks
for a group-phase change.

Future work should target the second phase and later phases with scoped pages,
services, props, or CSS selectors. Shared component edits must preserve the
current group-phase behavior by default.
