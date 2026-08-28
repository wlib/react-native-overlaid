# Execution plan

This file is the coordination source of truth. Agents own bounded workstreams;
the orchestrator owns architecture, integration, review, and acceptance.

## Phase 1: foundation and independent layers

- [x] Package/config owner: initialize package metadata, strict TypeScript,
      build/test/lint/format configs, source export map, core implementation, and
      exhaustive core tests.
- [x] React-kernel owner: implement contexts, lifecycle hook, host provider,
      portal, measurement, anchored positioning, controllable state, and focused
      kernel tests. Do not alter package/config files.
- [x] Chrome owner: implement common/native and web chrome interpreters plus
      styles. Keep imports against the planned kernel contracts; do not implement
      components or change configs.
- [x] Orchestrator review: reconcile contracts, run static checks, identify
      correctness gaps, and issue targeted repair tasks.

## Phase 2: public surface and parity suite

- [x] Component owner: implement the five public component families, shared
      parts, precise prop types, default styles, and public exports.
- [x] Test owner: add native/web integration tests and a reference parity matrix
      covering every behavior in `docs/PRODUCT.md`.
- [x] Documentation/example owner: write README, platform divergence notes,
      focused examples, and release/package guidance.
- [x] Orchestrator review: check API consistency, code size, source boundaries,
      accessibility, packaging, and prototype parity.

## Phase 3: verification and review loops

- [x] Install dependencies and lock them.
- [x] Run format/lint, typecheck, core/native/web tests, build, and pack checks.
- [x] Fix failures at their owning layer; add regressions for every substantive
      bug found during integration.
- [x] First independent review: correctness, concurrency/lifecycle, platform
      synchronization, stacking, gestures, and accessibility.
- [x] Second independent review: public API, type design, package artifacts,
      docs, maintainability, and unnecessary code.
- [x] Resolve every high/medium issue and rerun the full verification matrix.

## Workstream boundaries

- Package/config owner may write root configs and `src/core/**`.
- React-kernel owner may write `src/react/**` and its colocated tests.
- Chrome owner may write `src/chrome/**` and `styles.css`.
- Later component owner may write `src/components/**` and `src/index.ts`.
- Later parity/docs owners may write tests, examples, README, and parity docs as
  assigned. Existing user/orchestrator files are never replaced wholesale.

## Verification commands (target shape)

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:core
npm run test:native
npm run test:web
npm run build
npm run pack:check
```

Exact scripts may be adjusted by the package owner, but equivalent coverage is
required and `npm test` must run the complete automated suite.
