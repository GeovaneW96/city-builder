/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    /* ─── DEPENDENCY INVERSION (DIP) ─── */

    {
      name: "simulation-must-not-depend-on-rendering",
      severity: "error",
      comment: "Simulation should be independent of rendering (DIP). Rendering reads simulation state, not the other way.",
      from: { path: "^src/simulation/" },
      to: { path: "^src/rendering/" },
    },
    {
      name: "simulation-must-not-depend-on-ui",
      severity: "error",
      comment: "Simulation should not depend on UI concerns.",
      from: { path: "^src/simulation/" },
      to: { path: "^src/ui/" },
    },
    {
      name: "simulation-must-not-depend-on-three",
      severity: "error",
      comment: "Simulation code must not import Three.js.",
      from: { path: "^src/simulation/" },
      to: { path: "node_modules/three" },
    },
    {
      name: "data-must-not-depend-on-simulation",
      severity: "error",
      comment: "Data files are static definitions. They should not depend on simulation logic.",
      from: { path: "^src/data/" },
      to: { path: "^src/simulation/" },
    },
    {
      name: "data-must-not-depend-on-rendering-or-ui",
      severity: "error",
      comment: "Data files must not depend on rendering or UI.",
      from: { path: "^src/data/" },
      to: { path: "^(src/rendering/|src/ui/)" },
    },
    {
      name: "shared-must-not-depend-on-local-code",
      severity: "error",
      comment: "Shared utilities and types must be independent — no dependencies on other src/ modules.",
      from: { path: "^src/shared/" },
      to: { path: "^src/(simulation|rendering|ui|data|save)/" },
    },

    /* ─── SINGLE RESPONSIBILITY (SRP) WARNINGS ─── */

    {
      name: "simulation-store-should-not-import-all-domains",
      severity: "warn",
      comment: "store.ts should be a thin coordinator. Heavy imports suggest it is absorbing domain logic it should delegate.",
      from: { path: "simulation/store\\.ts" },
      to: { path: "^src/simulation/(economy|demand|growth|services|traffic|progression|warnings)/" },
    },
    {
      name: "tick-should-not-import-all-systems",
      severity: "warn",
      comment: "tick() should iterate over registered systems, not import each one individually. Consider a registry pattern for OCP.",
      from: { path: "simulation/tick\\.ts" },
      to: { path: "^src/simulation/(economy|demand|growth|services|traffic|progression|warnings)/" },
    },

    /* ─── OPEN/CLOSED PRINCIPLE (OCP) ─── */

    {
      name: "command-handlers-should-be-registered-not-imported",
      severity: "warn",
      comment: "New command handlers should register into a map rather than being imported individually by the dispatcher. Prevents modification of existing code.",
      from: { path: "simulation/command-dispatcher\\.ts" },
      to: { path: "^src/simulation/handlers/" },
    },

    /* ─── CIRCULAR DEPENDENCIES ─── */

    {
      name: "no-circular-dependencies",
      severity: "error",
      comment: "Circular dependencies create tight coupling and make systems untestable in isolation.",
      from: {},
      to: { circular: true },
    },

    /* ─── LAYER VIOLATIONS (rendering reading shape) ─── */

    {
      name: "rendering-should-only-read-simulation-state",
      severity: "warn",
      comment: "Rendering should read simulation state and shared types — not depend on UI or data modules.",
      from: { path: "^src/rendering/" },
      to: { path: "^(src/ui/|src/data/)" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "default"],
    },
    exclude: {
      path: "(node_modules|\\.test\\.ts|__tests__|dist)",
    },
    reporterOptions: {
      dot: {
        collapsePattern: "^(node_modules)/",
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
