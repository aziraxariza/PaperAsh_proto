# Paper Ash Diary

> Currently a prototype of a personal diary and digital archive for publishing stories, photographs and memories.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square\&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square\&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square\&logo=vite)
![Express](https://img.shields.io/badge/Express-4-black?style=flat-square\&logo=express)
![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?style=flat-square\&logo=trpc)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square\&logo=mysql)

---

## What it does

Paper Ash Diary is a full-stack personal publishing platform designed around the experience of a physical journal.

It provides:

* **Diary Publishing** — create and publish long-form entries with titles, rich text, excerpts, dates, and photographs
* **Photo Attachments** — attach up to 8 images to an entry with S3-compatible object storage
* **Chronological Archive** — browse published entries as a personal timeline
* **Public Reading** — visitors can read individual diary entries through unique slugs
* **Visitor Comments** — readers can leave comments on published entries
* **Comment Moderation** — comments remain pending until approved by the diary owner
* **Owner Authentication** — publishing and moderation operations are restricted to the authenticated owner
* **Responsive Interface** — journal-inspired interface designed for desktop and mobile
* **Cloud Storage** — images are stored externally rather than directly in the database
* **Type-safe API** — frontend and backend communicate through tRPC with shared TypeScript types

---

## Demo

> Write an entry → attach photographs → publish → share the entry → moderate reader comments.

### Example flow

```text
Owner
  ↓
Sign in
  ↓
Create diary entry
  ↓
Add text + photographs
  ↓
Publish
  ↓
Public diary
  ↓
Reader leaves comment
  ↓
Owner approves comment
  ↓
Comment becomes visible
```

---

## Tech Stack

| Layer           | Technology                        |
| --------------- | --------------------------------- |
| Frontend        | React 19 + TypeScript             |
| Build Tool      | Vite 7                            |
| Styling         | Tailwind CSS                      |
| UI Components   | Radix UI                          |
| Routing         | Wouter                            |
| API             | tRPC 11                           |
| Backend         | Node.js + Express                 |
| ORM             | Drizzle ORM                       |
| Database        | MySQL / TiDB                      |
| Object Storage  | Amazon S3 / S3-compatible storage |
| Authentication  | JWT-based sessions                |
| Validation      | Zod                               |
| Testing         | Vitest                            |
| Package Manager | pnpm                              |
| Deployment      | Render / Docker                   |

---

## Architecture

```text
                        ┌──────────────────┐
                        │   React + Vite   │
                        │    Frontend      │
                        └────────┬─────────┘
                                 │
                                 │ tRPC
                                 ▼
                        ┌──────────────────┐
                        │ Express Server   │
                        │                  │
                        │   tRPC Router    │
                        └───────┬───┬──────┘
                                │   │
                    ┌───────────┘   └────────────┐
                    ▼                            ▼
             ┌─────────────┐             ┌─────────────┐
             │   Drizzle   │             │ S3 Storage  │
             │     ORM     │             │             │
             └──────┬──────┘             └─────────────┘
                    │
                    ▼
             ┌─────────────┐
             │ MySQL/TiDB  │
             │             │
             │ Users       │
             │ Posts       │
             │ Photos      │
             │ Comments    │
             └─────────────┘
```

### Request flow

```text
Browser
   ↓
React
   ↓
tRPC Client
   ↓
Express
   ↓
tRPC Procedure
   ↓
┌───────────────┬────────────────┐
│               │                │
▼               ▼                ▼
Drizzle       Auth            S3 Storage
  │
  ▼
MySQL / TiDB
```

---

## Data Model

The application uses four primary database entities:

```text
Users
  │
  └── authorId ──→ Posts
                      │
                      ├── postId ──→ Photos
                      │
                      └── postId ──→ Comments
```

### Users

Stores owner/account information and authorization roles.

```text
id
openId
name
email
loginMethod
role
createdAt
updatedAt
lastSignedIn
```

### Posts

Stores the diary entries.

```text
id
slug
title
body
excerpt
publishedAt
createdAt
updatedAt
authorId
```

### Photos

Stores metadata for photographs uploaded to object storage.

```text
id
postId
storageKey
url
altText
sortOrder
createdAt
```

### Comments

Stores visitor comments and their moderation state.

```text
id
postId
authorName
body
approved
createdAt
```

---

## Authentication and Authorization

The application uses JWT-based sessions stored through HTTP cookies.

There are two levels of access:

```text
Public
  ├── View diary entries
  ├── View individual posts
  └── Submit comments

Owner
  ├── Create posts
  ├── Delete posts
  ├── View comments
  ├── Approve comments
  └── Delete comments
```

Owner-only procedures are protected server-side rather than relying solely on frontend visibility.

---

## Image Storage

Images are uploaded to an S3-compatible object store.

The upload flow is:

```text
Image
  ↓
Client
  ↓
Base64 payload
  ↓
Server validation
  ↓
8 MB size check
  ↓
S3-compatible storage
  ↓
Stored URL + metadata
  ↓
Database
```

Each diary entry can contain a maximum of **8 photographs**.

Each image is limited to **8 MB**.

Storage keys follow the structure:

```text
paper-ash-diary/
└── <post-id>/
    └── <image-name>
```

---

## API

The backend is exposed through type-safe tRPC procedures.

### Authentication

| Procedure     | Description                            |
| ------------- | -------------------------------------- |
| `auth.me`     | Returns the current authenticated user |
| `auth.login`  | Authenticates the diary owner          |
| `auth.logout` | Clears the owner session               |

### Blog

| Procedure     | Description                     |
| ------------- | ------------------------------- |
| `blog.list`   | Returns published diary entries |
| `blog.bySlug` | Retrieves an individual entry   |
| `blog.create` | Creates a new diary entry       |
| `blog.remove` | Deletes an entry                |

### Comments

| Procedure                 | Description                       |
| ------------------------- | --------------------------------- |
| `blog.addComment`         | Submits a visitor comment         |
| `blog.moderation`         | Retrieves comments for moderation |
| `blog.setCommentApproval` | Approves or rejects a comment     |
| `blog.deleteComment`      | Deletes a comment                 |

---

## Project Structure

```text
paper-ash-diary/
├── client/
│   └── src/
│       ├── components/
│       │   ├── ui/
│       │   └── ErrorBoundary.tsx
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── ComponentShowcase.tsx
│       │   └── NotFound.tsx
│       ├── App.tsx
│       ├── const.ts
│       ├── index.css
│       └── main.tsx
│
├── server/
│   ├── _core/
│   │   ├── auth.ts
│   │   ├── context.ts
│   │   ├── cookies.ts
│   │   ├── env.ts
│   │   ├── index.ts
│   │   ├── storageProxy.ts
│   │   ├── systemRouter.ts
│   │   ├── trpc.ts
│   │   └── vite.ts
│   ├── db.ts
│   ├── routers.ts
│   ├── storage.ts
│   └── *.test.ts
│
├── shared/
│   ├── const.ts
│   ├── types.ts
│   └── _core/
│
├── drizzle/
│   ├── schema.ts
│   ├── relations.ts
│   └── migrations/
│
├── scripts/
│   └── create-admin.ts
│
├── Dockerfile
├── Procfile
├── render.yaml
├── drizzle.config.ts
├── vite.config.ts
├── vitest.config.ts
├── package.json
├── pnpm-lock.yaml
└── .env.example
```
## Design

Paper Ash Diary deliberately avoids the visual language of a conventional CMS.

The interface is built around:

* Paper-inspired surfaces
* Editorial typography
* Muted, archival styling
* Large photographic content
* Journal-like spacing
* Responsive layouts

The goal is to make a digital diary feel like a **physical archive of personal writing and photographs** rather than a conventional social platform.

---

## Future Work

* Draft entries
* Scheduled publishing
* Private entries
* Tags and categories
* Improved full-text search
* Image captions
* Diary export to PDF
* Automatic backups
* Offline/PWA support
* Accessibility improvements
* Additional storage providers
* Richer editing capabilities

---

## Author

**Ariza Wasim**

GitHub: [@aziraxariza](https://github.com/aziraxariza)
