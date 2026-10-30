import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Pages and components reach the database only through lib/data.
    files: ["app/**", "components/**"],
    ignores: ["app/api/auth/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/auth", "@/lib/supabase/*", "@supabase/*", "pg"],
              message: "Use the functions in @/lib/data instead.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
