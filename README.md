# Secure Note-Taking API

REST API for a note-taking platform with JWT authentication and role-based access control (User / Admin).

**Stack:** Node.js, Express, MongoDB, Mongoose, JWT, bcrypt

## Live Links

- Frontend GitHub     : https://github.com/codersujon/notes_frontend
- Backend GitHub      : https://github.com/codersujon/notes_backend
- Live frontend URL   : https://notes-frontend-ten-pi.vercel.app/
- Live backend API URL: https://notes-app-backend-yv1s.onrender.com/

> The backend runs on Render's free tier. After inactivity the first request can take 30-60 seconds to wake up.

## Test Accounts

| Role  | Email           | Password     |
|-------|-----------------|--------------|
| Admin | admin@example.com | 123456   |
| User  | user@example.com  | 123456   |

## Roles & Permissions

| Role  | Permissions |
|-------|-------------|
| User  | Create, update, delete and list their own notes. Create posts. View any user's posts. |
| Admin | Everything a user can do, plus manage users (add, update, remove, list) and view everyone's notes. |

## Setup

```bash
git clone https://github.com/<you>/<backend-repo>
cd <backend-repo>
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

Environment variables (`.env.example`):

```
PORT=5050
MONGO_URI=
JWT_SECRET=
FRONTEND_URL=http://localhost:5173
```

Scripts: `npm run dev` (nodemon), `npm start` (production).

## Project Structure

```
src/
  config/db.js
  controllers/   auth, note, admin, post
  middleware/auth.js      (authenticate, authorize)
  models/        User, Note, Post
  routes/
  utils/paginate.js
  app.js
server.js
```

## Authentication & Security

- Passwords are hashed with **bcrypt** (cost factor 10). The `password` field is `select: false`, so it is never returned by queries.
- **JWT** (7 days) is sent as `Authorization: Bearer <token>`.
- `authenticate` verifies the token and re-loads the user from the database, so a deleted user or changed role takes effect immediately.
- `authorize("admin")` guards admin routes. It always runs after `authenticate`.
- Registration never accepts a `role`; new users are always `user`. Only an admin can set roles.
- Another user's note returns `404` (not `403`) so the note's existence is not revealed.
- Admins cannot delete themselves or demote their own role.
- Deleting a user also deletes their notes and posts (no orphan data).

## API Endpoints

All list endpoints are paginated: `?page=1&limit=10` (default limit 10, max 100).

### Auth
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register (role is always `user`) |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Logged in | Current profile |

### Notes
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/notes` | Logged in | Own notes (paginated) |
| POST | `/api/notes` | Logged in | Create note |
| GET | `/api/notes/:id` | Owner / Admin | Get one note |
| PUT | `/api/notes/:id` | Owner / Admin | Update note |
| DELETE | `/api/notes/:id` | Owner / Admin | Delete note |

### Admin
| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/notes` | All notes (paginated) |
| GET | `/api/admin/users` | List users (paginated) |
| POST | `/api/admin/users` | Add user |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Remove user (and their notes/posts) |

### Posts & Aggregations
| Method | Route | Description |
|---|---|---|
| POST | `/api/posts` | Create a post |
| GET | `/api/users/:id/posts` | **Scenario 2:** a user's posts (`$lookup`) |
| GET | `/api/users/grouped-by-interests` | **Scenario 1:** users grouped by interest |

## Indexes

All indexes are defined with `schema.index()` in the models. Every index maps to a specific query; nothing else is indexed.

| Collection | Index | Query it supports |
|---|---|---|
| users | `{ email: 1 }` (unique) | Login lookup and email uniqueness |
| users | `{ createdAt: -1 }` | Admin users list (sorted newest first, paginated) |
| notes | `{ owner: 1, createdAt: -1 }` | A user's own notes list. Equality on `owner`, then sort on `createdAt` (ESR rule). Its `owner` prefix also serves `Note.deleteMany({ owner })` |
| notes | `{ createdAt: -1 }` | Admin list of all notes (sorted newest first) |
| posts | `{ author: 1, createdAt: -1 }` | `$lookup` join on `author` and a user's posts newest first. Its prefix also serves `Post.deleteMany({ author })` |

Read operations by `_id` (profile, single note, single user) use MongoDB's default `_id` index.

### Indexes intentionally NOT created

- **`owner` / `author` single-field indexes:** already covered by the prefix of the compound indexes above.
- **`interests` (multikey):** Scenario 1 runs `$unwind` and `$group` over every user with no `$match`, so it must read the whole collection and an index cannot reduce the work. The index would only slow down writes and use storage.
- **Notes/posts `_id` lookups:** the default `_id` index is enough.

## Aggregations

### Scenario 1: Users grouped by interests

A single `User.aggregate()` call:

```js
[
  { $unwind: "$interests" },
  { $group: { _id: "$interests", count: { $sum: 1 },
              users: { $push: { id: "$_id", name: "$name" } } } },
  { $sort: { count: -1, _id: 1 } },
  { $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      total: [{ $count: "n" }]
  } }
]
```

- `$unwind` emits one document per interest.
- `$group` collects users per interest and counts them.
- `$sort` orders groups by size, with a stable tie-break on name.
- `$facet` returns the requested page and the total group count in the same call (pagination).

### Scenario 2: A user's posts

A single `User.aggregate()` call with `$lookup`:

```js
[
  { $match: { _id: userId } },
  { $lookup: {
      from: "posts",
      let: { uid: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$author", "$$uid"] } } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ],
      as: "posts"
  } },
  { $project: { name: 1, email: 1, posts: 1 } }
]
```

- `$match` is first and uses the `_id` index.
- `$lookup` joins on `posts.author`, supported by `{ author: 1, createdAt: -1 }`, so the join and the sort both use the index.
- The sub-pipeline form is used so the posts can be sorted and paginated inside the lookup.

## Verifying Index Usage

```js
db.notes.find({ owner: ObjectId("...") }).sort({ createdAt: -1 }).limit(10).explain("executionStats")
db.users.find().sort({ createdAt: -1 }).limit(10).explain("executionStats")
db.posts.find({ author: ObjectId("...") }).sort({ createdAt: -1 }).explain("executionStats")
```

Each plan shows `IXSCAN` (not `COLLSCAN`) with `totalDocsExamined` close to `nReturned`.

## Design Notes

- **Pagination:** `skip/limit` with a capped `limit` and a stable sort. For very large datasets, cursor-based pagination on `createdAt`/`_id` would scale better.
- **Cascade delete:** the user is deleted last, so a failure midway leaves the user in place and the delete can simply be retried.
- **Input validation** is basic (required fields, valid ObjectId) to keep the focus on indexing and aggregation.
