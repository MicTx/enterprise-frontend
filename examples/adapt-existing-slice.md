# Example — Adapt a Proven Vertical Slice

Use this example when adding a production page to an existing frontend. It demonstrates the skill's default behavior: inspect, select the nearest working analogue, copy the complete behavior boundary, and adapt it to the target domain.

## Request

> Add a supplier management page. It needs keyword/status filters, pagination, create/edit, disable, delete, and permission control. Match the existing product.

## 1. Inspect the target before designing

Read the target's local instructions and identify:

```text
package.json                 framework, libraries, scripts
src/app.*                    providers and runtime
src/routes.*                 route convention
src/access.*                 permission model
src/services/                request and service convention
src/queryKeys.*              server-state key convention
src/components/              shared page/modal/batch primitives
src/pages/                   candidate analogues
src/styles/ or theme config  visual system
existing tests               expected test level
```

Suppose the target already contains a complete customer-management flow:

```text
src/pages/customers/CustomerList.tsx
src/services/customers.ts
src/types/customer.ts
src/queryKeys.ts
src/access.ts
src/routes.ts
src/pages/customers/CustomerList.test.tsx
```

It is the best analogue because it has the same job and interaction lifecycle, even if another page looks more similar.

## 2. Define the vertical slice

Adapt these concerns together:

| Concern | Source | Target action |
|---|---|---|
| Page shell and toolbar | CustomerList | reuse unchanged |
| Filters and pagination | CustomerList | adapt field names and query params |
| Query/mutation flow | customer service + query keys | add supplier service and keys |
| Create/edit surface | customer drawer | adapt schema and validation |
| Disable/delete | existing confirmations | preserve pending/feedback/invalidation flow |
| Permissions | customer access checks | map to supplier permissions |
| Route/menu | customer registration pattern | add supplier entries |
| Tests | customer page tests | adapt fixtures and assertions |
| Theme/styles | target project | preserve; do not import a new design system |

## 3. Adapt semantics, not architecture

Example type and service boundary:

```ts
// src/types/supplier.ts
export type SupplierStatus = 'active' | 'disabled';

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  status: SupplierStatus;
  createdAt: string;
}

export interface SupplierListParams {
  keyword?: string;
  status?: SupplierStatus;
  page: number;
  pageSize: number;
}

export interface SupplierListResponse {
  items: Supplier[];
  total: number;
}

export interface SupplierInput {
  name: string;
  contactName: string;
  phone: string;
}
```

```ts
// src/services/suppliers.ts
import { request } from '@/utils/request';
import type {
  Supplier,
  SupplierInput,
  SupplierListParams,
  SupplierListResponse,
} from '@/types/supplier';

export function listSuppliers(params: SupplierListParams) {
  return request<SupplierListResponse>('/api/suppliers', { params });
}

export function createSupplier(input: SupplierInput) {
  return request<Supplier>('/api/suppliers', {
    method: 'POST',
    data: input,
  });
}

export function updateSupplier(id: string, input: SupplierInput) {
  return request<Supplier>(`/api/suppliers/${id}`, {
    method: 'PUT',
    data: input,
  });
}

export function disableSupplier(id: string) {
  return request<void>(`/api/suppliers/${id}/disable`, { method: 'POST' });
}

export function deleteSupplier(id: string) {
  return request<void>(`/api/suppliers/${id}`, { method: 'DELETE' });
}
```

Extend the existing key factory rather than introducing another cache convention:

```ts
// src/queryKeys.ts
export const queryKeys = {
  customers: (params: unknown) => ['customers', params] as const,
  suppliers: (params: unknown) => ['suppliers', params] as const,
};
```

Preserve the source flow:

```text
filter submit
→ reset page to 1
→ query key changes
→ list reloads

create/edit/disable/delete
→ mutation pending disables duplicate action
→ success feedback
→ close/reset surface where applicable
→ invalidate supplier list keys
→ visible list refreshes

failure
→ retain useful context
→ show actionable reason
```

## 4. Preserve target-native integration

The implementation should use the target's existing:

- page shell and content spacing;
- request wrapper and error normalization;
- query/mutation library;
- permission helper;
- drawer/modal convention;
- table and batch-action primitives;
- theme and styling hierarchy;
- route and menu registration style;
- test utilities.

Do **not** add a new Axios instance, Redux store, modal manager, CSS framework, or token palette merely because the example could be rebuilt that way.

## 5. Cover complete states

The page is not finished until it handles:

- initial loading;
- empty supplier directory;
- filtered empty result with reset action;
- request error with retry;
- no create/edit/delete permission;
- long supplier names and narrow viewport;
- create/edit validation;
- mutation pending and duplicate-submit prevention;
- delete/disable confirmation with impact text;
- success and failure feedback;
- list refresh after mutation.

## 6. Verify behavior, not resemblance alone

Run the repository's actual commands, for example:

```bash
npm test -- SupplierList
npm run typecheck
npm run lint
npm run build
```

Then open the route and exercise:

1. load the page;
2. search and reset;
3. change page;
4. open and cancel create;
5. submit invalid and valid create data;
6. edit a supplier;
7. disable/delete with confirmation;
8. verify the list refreshes;
9. verify restricted users cannot invoke protected actions;
10. check desktop and narrow layouts for clipping and unintended scroll.

Finally search changed files for residue from the analogue: customer identifiers, endpoints, route names, fixtures, labels, permissions, and comments.

## Expected Delivery

```text
Implemented supplier management by adapting the existing entity-management slice.

Changed:
- route/menu/access registration
- supplier types, service, and query keys
- supplier list and editor
- focused page tests

Verified:
- focused tests: passed
- typecheck: passed
- lint: passed
- production build: passed
- browser: search, pagination, create/edit, disable/delete, permission state passed
```

This example is a method, not a template to copy literally. In another repository, keep the same reasoning while using that repository's own file layout, components, libraries, naming, and verification commands.
