# Waline Comments and Pageviews

This site uses Waline for comments, comment counts, reactions, and pageview counts.

## Frontend Configuration

The Astro site reads the public Waline server URL from:

```env
PUBLIC_WALINE_SERVER_URL=https://your-waline-server.vercel.app
```

Only this public URL belongs in the Astro project. Supabase database credentials must stay in the separate Waline backend project.

## Backend Deployment

Use a separate Vercel project for the Waline backend.

1. Create a Supabase project and copy a Postgres connection string from the Supabase dashboard.
2. Create or import a Waline backend project on Vercel.
3. Add the Waline backend environment variables in Vercel, including the Supabase/Postgres connection string required by your Waline backend template.
4. Deploy the Waline backend and copy its public deployment URL.
5. Add that URL to this Astro project as `PUBLIC_WALINE_SERVER_URL` for production, preview, and local development as needed.

Vercel environment variables can be managed in the dashboard or with the CLI:

```shell
vercel env add PUBLIC_WALINE_SERVER_URL production
vercel env add PUBLIC_WALINE_SERVER_URL preview
vercel env pull .env.local
```

## Page Keys

Waline binds comments and counters to page paths. Keep paths stable:

- Blog example: `/blog/FristBlog/`
- Note example: `/note/RAG%20demo`

The frontend normalizes counter paths before calling Waline, including spaces and duplicate slashes.

## Historical Comment Formatting

There is no historical comment data yet, but the import helper is ready for future use.

Input records should be an array of objects with these fields:

```json
{
  "url": "/blog/FristBlog/",
  "nick": "Joshua",
  "mail": "joshua@example.com",
  "link": "",
  "comment": "A historical comment.",
  "createdAt": "2026-06-04T10:00:00+08:00",
  "pid": "",
  "rid": "",
  "at": "",
  "ua": "",
  "status": "approved"
}
```

Required fields are `url`, `nick`, `comment`, and `createdAt`.

Format an input file:

```shell
bun run format:waline-history scripts/waline/historical-comments.example.json formatted-comments.json
```

Run helper tests:

```shell
bun run test:waline
```

After formatting, import the result through the Waline backend/admin workflow that matches the deployed backend.
