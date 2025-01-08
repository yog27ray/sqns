/* eslint-disable no-undef */
const importPlugin = require("eslint-plugin-import");
const { configs } = require("@eslint/js");
const promisePlugin = require("eslint-plugin-promise");
const typescriptEslintParser = require("@typescript-eslint/parser"); // Import parser object
const typescriptEslintPlugin = require("@typescript-eslint/eslint-plugin"); // Import plugin

module.exports = [
  configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptEslintParser, // Use parser object directly
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      import: importPlugin,
      promise: promisePlugin,
      "@typescript-eslint": typescriptEslintPlugin,
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...promisePlugin.configs.recommended.rules,
      ...typescriptEslintPlugin.configs.recommended.rules,
      ...typescriptEslintPlugin.configs["recommended-requiring-type-checking"].rules,
      "no-console": "error",
      "no-bitwise": "off",
      strict: "off",
      "@typescript-eslint/no-unused-vars": ["error", {
        "vars": "local",
        "varsIgnorePattern": "^_",
        "args": "after-used",
        "argsIgnorePattern": "^_"
      }],
      "class-methods-use-this": "off",
      "no-useless-constructor": "off",
      "no-empty-function": "off",
      "@typescript-eslint/type-annotation-spacing": "off",
      "no-shadow": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/explicit-function-return-type": ["error"],
      "@typescript-eslint/no-explicit-any": "off",
      "no-async-promise-executor": "off",
      "promise/no-callback-in-promise": "off",
      "promise/no-return-wrap": "off",
      "require-atomic-updates": "off",
      indent: ["error", 2, { FunctionDeclaration: { parameters: "first" }, SwitchCase: 1 }],
      "function-paren-newline": "off",
      "object-curly-newline": ["error", { consistent: true }],
      "prefer-destructuring": ["error", { object: true, array: false }],
      "no-restricted-globals": "off",
      "no-multiple-empty-lines": "error",
      "max-len": ["error", 140],
      "no-unused-vars": "off",
      "no-return-assign": "off",
      "import/no-extraneous-dependencies": ["error", { devDependencies: true }],
      "import/extensions": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "import/prefer-default-export": "off",
      "no-use-before-define": ["error", { functions: true, classes: true }],
      "import/no-unresolved": "off",
      "no-underscore-dangle": "off",
      "no-undef": "off",
      "new-cap": ["error", { capIsNewExceptions: ["Router"] }],
    },
  },
  {
    files: ["**/*.spec.ts", "*.spec.ts", "src/test-env.ts", "src/setup.ts"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "prefer-promise-reject-errors": "off",
      "no-unused-expressions": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "max-classes-per-file": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
