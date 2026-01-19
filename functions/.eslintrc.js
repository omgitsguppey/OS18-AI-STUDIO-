/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,

  env: {
    es2021: true,
    node: true,
  },

  parser: "@typescript-eslint/parser",

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["tsconfig.json"],
  },

  plugins: [
    "@typescript-eslint",
    "import",
  ],

  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
  ],

  ignorePatterns: [
    "lib/**",
    "dist/**",
    "generated/**",
    "*.js",
  ],

  rules: {
    /* ───────────────────────────────
       DEPLOY-SAFETY OVERRIDES
       ─────────────────────────────── */

    // never block deploy for formatting
    "max-len": "off",
    "operator-linebreak": "off",
    "padded-blocks": "off",
    "comma-dangle": "off",

    // google style causes 90% of your pain — gone
    "require-jsdoc": "off",
    "valid-jsdoc": "off",

    /* ───────────────────────────────
       TYPESCRIPT SANITY (NOT NAGGY)
       ─────────────────────────────── */

    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_" },
    ],

    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",

    /* ───────────────────────────────
       IMPORT / MODULE SAFETY
       ─────────────────────────────── */

    "import/no-unresolved": "off", // TS handles this
    "import/prefer-default-export": "off",

    /* ───────────────────────────────
       REAL BUG CATCHERS (KEEP THESE)
       ─────────────────────────────── */

    "no-console": "off", // cloud functions log by design
    "no-undef": "error",
    "no-dupe-keys": "error",
    "no-unreachable": "error",
  },
};
