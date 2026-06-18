const nextVitals = require("eslint-config-next/core-web-vitals");

module.exports = [
  ...nextVitals,
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "playwright-report/**"]
  }
];

