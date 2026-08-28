# Changesets

Version and release management for this package, mirroring the setup in
the `bruh` monorepo. Docs: https://github.com/changesets/changesets

- `npm run changeset` — record a change (bump level + summary) alongside a PR.
- On merge to `main`, `.github/workflows/publish.yml` runs the changesets
  action: pending changesets become a "Version Packages" PR (version bump +
  CHANGELOG entry), and merging that PR publishes to npm.

Publishing is intentionally not armed yet: the workflow uses npm trusted
publishing (OIDC provenance, no token secret), which stays inert until this
package's trusted publisher is configured on npmjs.com for the
`wlib/react-native-overlaid` repository.
