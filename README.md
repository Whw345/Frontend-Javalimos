<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#cicd"><strong>CI/CD</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Proxy
  - Client
  - Server
  - It just works!
- Email and password and Google authentication with [Better Auth](https://www.better-auth.com), stored in your Supabase Postgres database
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Optional deployment with [Supabase Vercel Integration and Vercel deploy](#deploy-your-own)
  - Environment variables automatically assigned to Vercel project

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

```env
SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
SUPABASE_SECRET_KEY=[INSERT SUPABASE PROJECT SECRET KEY]
DATABASE_URL=[INSERT SUPABASE TRANSACTION POOLER STRING, ENDING IN ?sslmode=no-verify]
BETTER_AUTH_SECRET=[INSERT THE OUTPUT OF npx auth@latest secret]
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=[INSERT GOOGLE OAUTH CLIENT ID]
GOOGLE_CLIENT_SECRET=[INSERT GOOGLE OAUTH CLIENT SECRET]
```

Run [`db/better-auth.sql`](db/better-auth.sql) and then [`db/app.sql`](db/app.sql) in the SQL Editor of your Supabase project to create the tables. In production, set `BETTER_AUTH_URL` to your deployed URL.

Create the Google credentials in the [Google Auth Platform](https://console.cloud.google.com/auth/clients) as a **Web application** client, with `http://localhost:3000/api/auth/callback/google` and `https://your-domain.com/api/auth/callback/google` as authorized redirect URIs.

> [!NOTE]
> The frontend never connects to the database. Pages and components call the functions in `lib/data` (such as `listMyCourses()`), and ESLint rejects direct imports of the database client. Each file in `lib/data` covers one domain, checks the session, filters by the current user, and returns plain domain types, so only that folder knows about the engine. Because the client uses the secret key and bypasses RLS, every table you create needs `grant select, insert, update, delete` to `service_role` and RLS enabled with no policies, so the Data API stays closed to anyone holding only the publishable key.

Every sign-up becomes a student. Organizations are created in the SQL Editor, which stores only the hash of the API key. Generate the key with `npx auth@latest secret`:

```sql
insert into organization (name, api_key_hash)
values ('Your organization', encode(sha256(convert_to('YOUR API KEY', 'UTF8')), 'hex'));
```

To make an existing user a teacher of that organization, or to change their course limit, call the endpoint with its API key:

```bash
curl -X POST http://localhost:3000/api/teachers -H "x-api-key: $ORGANIZATION_API_KEY" -H "content-type: application/json" -d '{"email":"teacher@example.com","courseLimit":5}'
```

Teachers add students to their courses by email with `inviteStudentToMyCourse()`. The student must already have an account. Deleting an organization also deletes its teachers, their courses, those courses' games and enrollments, but not the users or their student rows.

Both `SUPABASE_URL` and `SUPABASE_SECRET_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## CI/CD

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) runs lint and build on every pull request and every push to `main`. If they pass, it deploys to Vercel: a preview for pull requests and production for `main`. The URL shows up in the pull request and in the repository's Deployments page. Pull requests from forks only run the checks.

[`vercel.json`](vercel.json) turns off Vercel's own Git deployments, so each commit deploys once and only after its checks pass. Changes in `db/` aren't applied by the pipeline: run them in the SQL Editor before merging.

To set it up once:

1. Link the repository to a Vercel project. This creates `.vercel/project.json`, which is gitignored and holds the `orgId` and `projectId` used in step 3:

   ```bash
   npx vercel link
   ```

2. In **Settings > Environment Variables** of the Vercel project, add the variables from `.env.example`:

   - **Production**: all of them, with `BETTER_AUTH_URL` set to your production URL.
   - **Preview**: all of them except `BETTER_AUTH_URL`, so Better Auth takes the origin from each request. Use a separate Supabase project, or previews will read and write production data.

3. Create a token in [your Vercel account settings](https://vercel.com/account/tokens) and add these in **Settings > Secrets and variables > Actions** of the GitHub repository:

   | Secret              | Value                                   |
   | ------------------- | --------------------------------------- |
   | `VERCEL_TOKEN`      | The token                               |
   | `VERCEL_ORG_ID`     | `orgId` from `.vercel/project.json`     |
   | `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

4. Add `https://your-domain.com/api/auth/callback/google` as an authorized redirect URI of the Google client. Preview URLs change on every deployment and Google doesn't accept wildcards, so previews only support email and password.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
