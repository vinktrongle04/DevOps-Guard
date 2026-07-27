**What does this change do, and why?**


**Checklist**

- [ ] `npm run lint` passes with no errors (root and `dashboard/` workspaces)
- [ ] `npm test` passes; added/updated tests for any behavior change
- [ ] If this adds/changes a `guard.config.js` key, it's actually read somewhere — no
      documented-but-unimplemented config
- [ ] If this adds a security rule, it has a fixture test in `scanner/security.test.js`
      (a true-positive sample, and a known-safe sample if relevant)
- [ ] If this touches `dashboard/src/`, `packages/core/dashboard-dist/` was rebuilt and
      committed (see [CONTRIBUTING.md](../CONTRIBUTING.md#releasing-a-dashboard-change))

**Related issue(s)**

Closes #
