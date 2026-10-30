import { TutorialStep } from "./tutorial-step";
import { CodeBlock } from "./code-block";

const organization = `insert into organization (name, api_key_hash)
values ('Your organization', encode(sha256(convert_to('YOUR API KEY', 'UTF8')), 'hex'));
`.trim();

const teacher = `curl -X POST http://localhost:3000/api/teachers \\
  -H "x-api-key: YOUR API KEY" \\
  -H "content-type: application/json" \\
  -d '{"email":"YOUR EMAIL","courseLimit":5}'
`.trim();

const server = `import { listMyCourses } from '@/lib/data/courses'
import { Suspense } from 'react'

async function Courses() {
  const courses = await listMyCourses()

  return <pre>{JSON.stringify(courses, null, 2)}</pre>
}

export default function Page() {
  return (
    <Suspense>
      <Courses />
    </Suspense>
  )
}
`.trim();

export function FetchDataSteps() {
  return (
    <ol className="flex flex-col gap-6">
      <TutorialStep title="Create the app tables">
        <p>
          Run{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            db/app.sql
          </span>{" "}
          in the{" "}
          <a
            href="https://supabase.com/dashboard/project/_/sql/new"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            SQL Editor
          </a>{" "}
          of your Supabase project.
        </p>
      </TutorialStep>

      <TutorialStep title="Keep Row Level Security (RLS) enabled">
        <p>
          All queries run on the server with the secret key, which bypasses RLS.
          The script grants access to that key only and enables RLS with no
          policies on every table, so the Data API stays closed to anyone else.
          Do the same for any table you add. You can learn more about RLS in the{" "}
          <a
            href="https://supabase.com/docs/guides/auth/row-level-security"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            Supabase docs
          </a>
          .
        </p>
      </TutorialStep>

      <TutorialStep title="Make yourself a teacher">
        <p>
          Every sign-up is a student. Only an organization&apos;s API key can
          turn a user into a teacher. Generate a key with{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            npx auth@latest secret
          </span>{" "}
          and create your organization in the SQL Editor:
        </p>
        <CodeBlock code={organization} />
        <p>Then run the following with that key and your email:</p>
        <CodeBlock code={teacher} />
      </TutorialStep>

      <TutorialStep title="Read your data from Next.js">
        <p>
          Pages never write queries. They call the functions in{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            lib/data
          </span>
          , which check the session and only return the data of the current
          user. Create a new page.tsx file at{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            /app/courses/page.tsx
          </span>{" "}
          and add the following.
        </p>
        <CodeBlock code={server} />
      </TutorialStep>

      <TutorialStep title="Build in a weekend and scale to millions!">
        <p>You&apos;re ready to launch your product to the world! 🚀</p>
      </TutorialStep>
    </ol>
  );
}
