# Business Ledger

This project is a TanStack Start + Supabase app deployed to Cloudflare Pages.

## Development

- `npm run dev` — start the dev server
- `npm run build` — production build (Cloudflare Pages target)
- `npm run lint` — lint
- `npm run format` — format with prettier

## Environment

Create a `.env` file (or set Cloudflare Pages env vars) with:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
