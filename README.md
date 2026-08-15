# ByteFlow Backend

Node.js, Express, and TypeScript backend with Prisma ORM (PostgreSQL) for ByteFlow.

## Tech Stack
- **Runtime**: Node.js (ESM)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database & ORM**: PostgreSQL, Prisma 7 (`@prisma/adapter-pg`)
- **Development Tooling**: `tsx` (fast live reload watcher)

## Getting Started

### 1. Environment Configuration
Ensure `.env` contains your PostgreSQL database URL and configuration:
```env
DATABASE_URL="postgresql://apple@localhost:5432/byteflow?schema=public"
PORT=5000
NODE_ENV=development
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Run in Development Mode
```bash
npm run dev
```
The server will start on `http://localhost:5000`.

## Available Scripts
- `npm run dev`: Start development server with live reload (`tsx watch src/server.ts`).
- `npm run build`: Compile TypeScript code to `dist/`.
- `npm run start`: Run production build.
- `npm run prisma:generate`: Generate Prisma Client.
- `npm run prisma:migrate`: Run Prisma migrations.
- `npm run prisma:studio`: Open Prisma Studio database GUI.

## API Endpoints
- `GET /`: API overview and status
- `GET /api/health`: Server health check, uptime, and database connectivity status
