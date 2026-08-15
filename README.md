# ByteFlow Backend

Node.js, Express, and TypeScript backend with Prisma ORM (PostgreSQL) and Socket.IO for ByteFlow.

## Tech Stack
- **Runtime**: Node.js (ESM)
- **Framework**: Express.js
- **Real-Time**: Socket.IO
- **Language**: TypeScript
- **Database & ORM**: PostgreSQL, Prisma 7 (`@prisma/adapter-pg`)
- **Development Tooling**: `tsx` (live reload watcher)

## Getting Started

### 1. Environment Configuration
Ensure `.env` contains your PostgreSQL database URL and configuration:
```env
DATABASE_URL="postgresql://apple@localhost:5432/byteflow?schema=public"
PORT=5000
NODE_ENV=development
JWT_SECRET="byteflow-jwt-secret"
CORS_ORIGIN="http://localhost:3000"
```

### 2. Install Dependencies & Migrate
```bash
npm install
npx prisma migrate dev
npx prisma generate
```

### 3. Run in Development Mode
```bash
npm run dev
```
The server will start on `http://localhost:5000`.

### 4. Run Multi-Level Stress & Functional Test Suite
```bash
npm run test:stress
```
Executes all 6 levels of automated tests:
- **Level 1**: Authentication, Super Admin authority, account locking, deactivation.
- **Level 2**: Projects, role-based isolation, cascading soft-delete, and restoration.
- **Level 3**: Kanban boards, concurrent card creations & lane moves, position reordering.
- **Level 4**: Real-time `@mentions`, comment notification generation, batch mark-as-read.
- **Level 5**: Workspace audit logs explorer pagination, filters, and dashboard metrics.
- **Level 6**: Frontend UI smoke tests on all Next.js routes.

## API Endpoints

### System & Health
- `GET /api/health` - Server health and database connectivity status

### Authentication & Profile (`/api/auth`)
- `POST /api/auth/register` - Public member registration (10 user limit)
- `POST /api/auth/login` - User authentication (checks active and unlocked status)
- `GET /api/auth/me` - Current user profile
- `PATCH /api/auth/change-password` - Update current user password

### Projects (`/api/projects`)
- `GET /api/projects` - List active projects for current user
- `POST /api/projects` - Create a project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project details
- `DELETE /api/projects/:id` - Soft delete project and cascade to lanes, cards, tags

### Lanes (`/api/lanes`)
- `GET /api/lanes/project/:projectId` - Get lanes for a project
- `POST /api/lanes` - Create a lane
- `PATCH /api/lanes/:id` - Update lane name/color
- `PATCH /api/lanes/reorder` - Reorder lanes
- `DELETE /api/lanes/:id` - Soft delete a lane

### Cards (`/api/cards`)
- `GET /api/cards/project/:projectId` - Get cards for a project (supports filtering & search)
- `POST /api/cards` - Create a card
- `GET /api/cards/:id` - Get card details
- `PATCH /api/cards/:id` - Update card details
- `PATCH /api/cards/:id/move` - Move card across lanes / reorder
- `DELETE /api/cards/:id` - Soft delete a card
- `POST /api/cards/:id/restore` - Restore a deleted card

### Comments & Mentions (`/api/comments`)
- `GET /api/comments/card/:cardId` - Get comments for a card
- `POST /api/comments` - Create comment (supports `@mention` alerts)
- `PATCH /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Soft delete comment

### Tags (`/api/tags`)
- `GET /api/tags/project/:projectId` - List tags for a project
- `POST /api/tags` - Create a tag
- `POST /api/tags/card/:cardId/assign` - Assign tag to card
- `DELETE /api/tags/card/:cardId/tag/:tagId` - Remove tag from card

### Dashboard & Metrics (`/api/dashboard`)
- `GET /api/dashboard/global` - Workspace summary metrics
- `GET /api/dashboard/project/:projectId` - Project progress, overdue, completion rate

### Notifications (`/api/notifications`)
- `GET /api/notifications` - Paginated notifications
- `PATCH /api/notifications/:id/read` - Mark single notification read
- `PATCH /api/notifications/read-all` - Mark all notifications read

### Admin Portal (`/api/admin`) - Requires `ADMIN` Role
- `GET /api/admin/stats` - Comprehensive system analytics
- `GET /api/admin/projects?includeDeleted=true` - All projects with optional deleted filter
- `POST /api/admin/projects/:id/restore` - Restore soft-deleted project and all underlying data
- `PUT /api/admin/projects/:id/members` - Update team allocations
- `GET /api/admin/users?includeDeleted=true` - User directory with status & allocated projects
- `PATCH /api/admin/users/:id/role` - Update user role
- `PATCH /api/admin/users/:id/lock` - Lock / unlock user account
- `DELETE /api/admin/users/:id` - Deactivate user account
- `POST /api/admin/users/:id/restore` - Restore deactivated user account
- `POST /api/admin/users/:id/reset-password` - Admin password reset
- `GET /api/admin/activities` - Workspace-wide audit logs with filters and pagination
