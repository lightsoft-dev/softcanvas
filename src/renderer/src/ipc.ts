// Thin renderer-side facade over the preload bridge. window.api is typed via
// the global declaration in src/preload/index.d.ts (included by tsconfig.web.json).
export const api = window.api
