# Contributing to WGF (Stars11)

Welcome! This is a fantasy cricket app built for our friend group. If you're here, you're probably one of us. Here's how to get set up and contribute.

## Local Setup

### Prerequisites
- Node.js 18+
- Docker (for local PostgreSQL)
- A CricAPI account (free tier) if you need to test score fetching

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/stars11.git
cd stars11

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your values — ask the group admin for shared keys if needed

# 4. Start the local database (Docker)
docker run -d --name stars11-db -p 5433:5432 -e POSTGRES_PASSWORD=postgres postgres:16

# 5. Push the schema to your local DB
npx prisma db push

# 6. Seed matches and players
npm run seed

# 7. Start the dev server
npm run dev
```

App runs at `http://localhost:3000`.

## Making Changes

1. Create a branch off `main`:
   ```bash
   git checkout -b your-feature-name
   ```

2. Make your changes. Keep commits small and focused.

3. Test locally — at minimum:
   - `npm run build` should pass with no errors
   - Test the flow you changed in the browser

4. Push and open a PR against `main`:
   ```bash
   git push origin your-feature-name
   ```

## Project Structure

```
src/
  app/
    (app)/        # Authenticated pages (dashboard, contests, admin, etc.)
    api/          # Backend API routes
    login/        # Auth page
  components/     # Shared UI components
  lib/            # Core logic (auth, scoring, cricket API, prisma client)
prisma/
  schema.prisma   # Database schema
scripts/
  seed.ts         # Seeds IPL matches + players
```

## Key Things to Know

- **Auth** is JWT-based with email OTP (via Brevo SMTP). No Supabase Auth.
- **Database** is PostgreSQL via Prisma ORM. Local dev uses Docker on port 5433.
- **CricAPI** keys have a 100 requests/day limit each. Don't burn them during development — use the admin manual entry for testing.
- **Prod deploys** happen automatically on `git push` to `main` via Vercel. Be careful with what you merge.
- **Schema changes** need manual SQL on Supabase before deploying. See README for details.

## What to Work On

Check `bugs.md` for known issues and their status. Pick something marked OPEN, or bring up new ideas in the group chat.

## Code Style

- TypeScript throughout
- Tailwind CSS for styling
- Keep it simple — this is a friends app, not enterprise software
- Don't add dependencies unless truly necessary
