const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: ["dist/**", ".test-dist/**", "src/vendor/pptxgen.browser.js"],
  },
  ...compat.config({
    env: {
      browser: true,
      node: true,
      es2021: true,
    },
    plugins: ["office-addins"],
    extends: ["plugin:office-addins/recommended"],
  }),
];
