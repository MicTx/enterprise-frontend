# Default Enterprise Frontend Profile

Use this file only when the user, target repository, supplied reference, and closest target-local example do not establish a decision. It is a fallback starting point, not a universal audit contract.

## Product character

Aim for a calm, information-dense enterprise interface:

- clear hierarchy before decoration;
- one obvious primary action per region;
- compact but readable controls;
- stable navigation and predictable feedback;
- restrained color and motion;
- visible system state and recoverable errors.

Avoid marketing-page scale, decorative glass layers, novelty motion, and large empty surfaces that reduce information utility.

## Suggested baseline

| Concern | Default |
|---|---|
| Framework | follow the target; for a new React admin app, use the current stable project-approved framework |
| Component system | Ant Design / ProComponents when no other system is established |
| Primary color | library default blue, changed only through theme tokens |
| Header | `56px` |
| Sider | `240px`, collapsible |
| Content spacing | `16px` for dense pages, `24px` for standard page rhythm; choose one project-wide |
| Body type | `14px` |
| Page title | `20px` |
| Card title | `16px` |
| Breakpoints | use the component system/project defaults unless the product specifies a device matrix |
| Motion | short, reversible, state-explaining; generally under `200ms` |

Do not inject these values into a project that already has a coherent theme.

## Page topology

Choose by job:

### Entity management

- filters and principal action near the data they control;
- table/list owns sorting, selection, and pagination state;
- temporary create/edit/detail work uses the project's existing drawer/modal convention when preserving list context matters;
- destructive actions communicate scope and irreversibility.

### Dashboard/workbench

- allocate the viewport deliberately;
- keep global filters stable while data regions refresh;
- use cards or panels only where they clarify independent responsibility;
- large maps/charts receive meaningful space rather than equal-card symmetry;
- dense feeds/tables may scroll inside bounded regions.

### Long form/detail/document

- prefer natural page scroll;
- group by user decision or information domain, not arbitrary field counts;
- keep submit/navigation actions visible when the form length justifies it;
- do not fragment a readable document into forced viewport cards.

### Map or canvas workspace

- treat the map/canvas as the primary surface;
- overlays and side panels must have explicit size and overflow ownership;
- resize the rendering surface when containers change;
- avoid document scroll unless it is part of the surrounding product shell.

## Interaction defaults

- Preserve list context for temporary detail/edit actions.
- Store shareable filter/sort/page state in the URL when the project convention supports it.
- Disable duplicate submissions while pending.
- Provide retry for recoverable load failures.
- Use skeletons for known structure and spinners for localized indeterminate work.
- Separate first-empty from filtered-empty when the available recovery action differs.
- Use semantic status colors and never communicate state by color alone.

## Copy defaults

Use the target product vocabulary first. If none exists:

- actions are concise verbs;
- success states say what completed;
- failures include a useful reason or recovery action;
- empty states explain whether data never existed, filters found nothing, or access is unavailable;
- destructive confirmation names the affected object and consequence;
- placeholders add format or constraint information instead of repeating labels.

Do not enforce one language or one synonym across unrelated products.

## CSS and theming defaults

1. global theme tokens for product-wide choices;
2. component tokens or semantic style slots for component-wide choices;
3. component props and composition;
4. scoped styles for layout, overflow, or domain-specific visualization;
5. custom components when established primitives cannot express the required behavior.

Prefer reuse and semantic values. Avoid arbitrary one-off numbers, global selector leakage, and duplicating the component library's skin.
