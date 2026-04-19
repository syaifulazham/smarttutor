# QuestionCapture — Claude Code Build Instructions
### A Micro-SaaS AI Tutoring Platform
---

## 1. PROJECT OVERVIEW

**Product Name:** QuestionCapture (working title — rename as preferred)

**Vision:** A web-first AI-powered tutoring platform that lets students capture questions from any source (voice, image, camera, text), reproduce them faithfully (including graphs, tables, diagrams, equations), and then engage with an AI tutor to either attempt the question with guided review or receive a full step-by-step explanation. All sessions are saved and exportable as PDF.

**Architecture Philosophy:**
- Web app first (React + Node.js)
- API-first design so the mobile app (React Native or Flutter) can consume the same backend
- Modular, feature-flagged services for scalability
- Clean separation: frontend / API / AI services / storage

---

## 2. TECH STACK

### Frontend (Web)
- **Framework:** React 18 + TypeScript
- **Routing:** React Router v6
- **State Management:** Zustand (lightweight, mobile-friendly later)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Rich Content Rendering:** KaTeX (math), Mermaid.js (diagrams/flowcharts), react-markdown
- **PDF Generation:** React-PDF (`@react-pdf/renderer`)
- **Voice Input:** Web Speech API (browser-native) + Whisper API (fallback/accuracy)
- **Image Upload:** react-dropzone + browser camera API
- **HTTP Client:** Axios or native fetch with React Query (TanStack Query)

### Backend (API)
- **Runtime:** Node.js 20+
- **Framework:** Express.js + TypeScript
- **AI Integration:** Google Gemini API (gemini-2.5-flash)
  - Vision: image/question parsing
  - Conversation: tutoring sessions
- **OCR/Vision:** Gemini's vision API (primary), Tesseract.js (offline fallback)
- **Voice Transcription:** OpenAI Whisper API or AssemblyAI
- **Database:** PostgreSQL via Prisma ORM
- **File Storage:** AWS S3 or Cloudflare R2 (store images, audio, PDFs)
- **Auth:** Clerk (JWT-based, works for web + mobile)
- **Queue/Jobs:** BullMQ + Redis (for async AI processing jobs)

### Infrastructure
- **Deployment:** Railway or Render (easy, scalable) or Vercel (frontend) + Railway (backend)
- **Database Hosting:** Supabase (PostgreSQL) or Railway
- **Environment Config:** dotenv + env validation via Zod

---

## 3. FOLDER STRUCTURE

```
questioncapture/
├── apps/
│   ├── web/                          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── capture/          # Input capture UI
│   │   │   │   ├── tutor/            # Tutoring session UI
│   │   │   │   ├── question/         # Question rendering components
│   │   │   │   ├── pdf/              # PDF export components
│   │   │   │   └── shared/           # Buttons, modals, layout
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── CaptureQuestion.tsx
│   │   │   │   ├── SessionView.tsx
│   │   │   │   ├── History.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── store/                # Zustand state slices
│   │   │   ├── services/             # API call functions
│   │   │   ├── types/                # Shared TypeScript types
│   │   │   └── utils/                # Helpers
│   │   └── package.json
│   │
│   └── mobile/                       # Future: React Native or Flutter
│       └── README.md                 # Placeholder + API contract doc
│
├── packages/
│   └── shared/                       # Shared types/utils for web + mobile + api
│       ├── types/
│       │   ├── question.ts
│       │   ├── session.ts
│       │   └── user.ts
│       └── utils/
│
├── server/                           # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── questions.ts
│   │   │   ├── sessions.ts
│   │   │   ├── capture.ts
│   │   │   └── export.ts
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── geminiService.ts  # All Gemini API calls
│   │   │   │   └── whisperService.ts # Voice transcription
│   │   │   ├── storage/
│   │   │   │   └── s3Service.ts
│   │   │   └── pdf/
│   │   │       └── pdfService.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── index.ts
│   └── package.json
│
├── .env.example
├── docker-compose.yml                # Local dev: Postgres + Redis
├── turbo.json                        # Turborepo monorepo config
└── package.json
```

---

## 4. DATABASE SCHEMA (Prisma)

```prisma
// server/src/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  createdAt     DateTime  @default(now())
  questions     Question[]
  sessions      Session[]
}

model Question {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  sourceType      SourceType  // VOICE | IMAGE | TEXT | CAMERA
  rawInput        String?   // original text/transcript
  imageUrl        String?   // S3 URL if image source
  audioUrl        String?   // S3 URL if voice source
  parsedContent   Json      // structured question: text, equations, tables, diagrams
  subject         String?   // auto-detected: Math, Physics, etc.
  difficulty      String?   // auto-detected: Easy, Medium, Hard
  tags            String[]
  createdAt       DateTime  @default(now())
  sessions        Session[]
}

model Session {
  id            String        @id @default(cuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  questionId    String
  question      Question      @relation(fields: [questionId], references: [id])
  mode          SessionMode   // SELF_ATTEMPT | DIRECT_EXPLANATION
  messages      Json[]        // conversation history [{role, content, timestamp}]
  userAnswer    String?       // user's submitted answer (self attempt mode)
  aiReview      String?       // AI review of user answer
  aiExplanation String?       // full AI explanation
  score         Int?          // 0–100 if self-attempt mode
  completed     Boolean       @default(false)
  pdfUrl        String?       // exported PDF URL
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

enum SourceType {
  VOICE
  IMAGE
  CAMERA
  TEXT
}

enum SessionMode {
  SELF_ATTEMPT
  DIRECT_EXPLANATION
}
```

---

## 5. API ROUTES SPECIFICATION

### Capture & Question
```
POST   /api/capture/text          # Submit raw text question
POST   /api/capture/image         # Upload image (multipart/form-data)
POST   /api/capture/voice         # Upload audio blob
GET    /api/questions             # List user's questions (paginated)
GET    /api/questions/:id         # Get single question with parsed content
DELETE /api/questions/:id         # Delete question
```

### Session (Tutoring)
```
POST   /api/sessions              # Create session { questionId, mode }
GET    /api/sessions/:id          # Get session details
POST   /api/sessions/:id/message  # Send message to tutor (streaming SSE)
POST   /api/sessions/:id/submit   # Submit user answer for review
POST   /api/sessions/:id/complete # Mark session complete
GET    /api/sessions              # List user's sessions (history)
```

### Export
```
POST   /api/export/pdf/:sessionId # Generate PDF of session
GET    /api/export/download/:id   # Download generated PDF
```

### Auth (via Clerk webhooks or Supabase)
```
POST   /api/auth/webhook          # Sync user creation
GET    /api/auth/me               # Current user profile
```

---

## 6. AI SERVICE DESIGN

### 6.1 Question Parsing Service (`geminiService.ts`)

**Purpose:** Take raw input (text/image/audio transcript) → return structured question object.

```typescript
// Uses @google/generative-ai SDK with gemini-2.5-flash model
// Prompt strategy for parsing questions from images/text
const PARSE_SYSTEM_PROMPT = `
You are an expert at parsing academic questions from any source.
Given an image or text, extract and structure the question.

Return a JSON object:
{
  "questionText": "clean question text with proper formatting",
  "type": "multiple_choice | short_answer | long_answer | calculation | diagram_based",
  "subject": "Mathematics | Physics | Chemistry | Biology | History | etc",
  "difficulty": "Easy | Medium | Hard",
  "components": [
    { "type": "text", "content": "..." },
    { "type": "equation", "content": "LaTeX string", "display": true/false },
    { "type": "table", "headers": [], "rows": [[]] },
    { "type": "diagram_description", "content": "describe the diagram for reproduction" },
    { "type": "image_reference", "url": "...", "caption": "..." },
    { "type": "options", "items": ["A. ...", "B. ...", "C. ...", "D. ..."] }
  ],
  "tags": ["algebra", "quadratic", "etc"]
}

Be precise with LaTeX for all mathematical expressions.
For diagrams, provide enough description to regenerate using Mermaid.js.
`;
```

### 6.2 Tutor Conversation Service

**Mode A — Self Attempt:**
```
System prompt: Act as an encouraging tutor. The student wants to attempt the question themselves.
1. Present the question clearly
2. Ask if they're ready
3. Accept their answer
4. Review it: highlight what's correct, what's wrong, guide to correct answer
5. Give a score and explanation
```

**Mode B — Direct Explanation:**
```
System prompt: Act as a clear, step-by-step tutor.
1. Acknowledge the question
2. Break it into steps
3. Explain each step with reasoning
4. Summarize the solution approach
5. Offer to clarify anything
```

### 6.3 Streaming SSE Implementation
- Use Server-Sent Events (SSE) for real-time streaming AI responses via Gemini's `generateContentStream`
- Endpoint: `POST /api/sessions/:id/message`
- Frontend uses `EventSource` or `fetch` with `ReadableStream`

---

## 7. FRONTEND KEY SCREENS & COMPONENTS

### Screen 1: Dashboard (`/`)
- Recent sessions list (cards)
- Quick capture button (prominent CTA)
- Stats: questions captured, sessions completed, avg score

### Screen 2: Capture Question (`/capture`)
**Sub-components:**
- `VoiceCapture` — mic button, waveform animation, live transcript preview
- `ImageCapture` — drag-drop zone + camera button (uses `getUserMedia`)
- `TextCapture` — rich text area with equation toolbar (KaTeX preview)
- After capture → loading state ("Analysing your question...") → preview parsed question

### Screen 3: Question Preview (`/question/:id`)
**`QuestionRenderer` component — renders based on component type:**
```tsx
// Must handle all component types:
<TextBlock />          // plain text with markdown
<EquationBlock />      // KaTeX rendered equation (inline or display)
<TableBlock />         // responsive HTML table
<DiagramBlock />       // Mermaid.js rendered diagram
<ImageBlock />         // img tag with caption
<OptionsBlock />       // A/B/C/D multiple choice display
```

**Tutor Mode Selector:**
- Modal/card asking: "How would you like to approach this question?"
  - Button: "I'll try it myself 💪" → Mode A
  - Button: "Explain it to me 🎓" → Mode B

### Screen 4: Session View (`/session/:id`)
**Layout:** Split panel (resizable)
- Left: Question display (read-only `QuestionRenderer`)
- Right: Chat interface (tutor conversation)
  - Streaming message bubbles
  - User input area (text + optional voice input)
  - For Mode A: dedicated "Submit My Answer" panel

### Screen 5: History (`/history`)
- Filterable list of past sessions
- Filter by: subject, mode, date, completion status
- Export PDF button per session

### Screen 6: PDF Export Preview (`/export/:sessionId`)
- Rendered PDF preview using `@react-pdf/renderer`
- Includes: Question, session transcript, answer/review/explanation
- Download button

---

## 8. PDF EXPORT STRUCTURE

The PDF should include:

```
[Header: QuestionCapture | Date | User Name]

QUESTION
─────────────────────────────
[Full question text, equations rendered as images via KaTeX/MathJax server-side]
[Tables reproduced]
[Diagrams as PNG snapshots]

SESSION DETAILS
─────────────────────────────
Mode: Self Attempt / Direct Explanation
Subject: Mathematics | Difficulty: Medium
Duration: 12 minutes

[If Self Attempt mode:]
MY ANSWER
─────────────────────────────
[User's submitted answer]

AI REVIEW
─────────────────────────────
Score: 78/100
[Review content]

FULL EXPLANATION
─────────────────────────────
[Step-by-step explanation]

[Footer: Generated by QuestionCapture | questioncapture.app]
```

**Implementation notes:**
- Use `@react-pdf/renderer` for layout
- Equations: render KaTeX to SVG server-side, embed as SVG in PDF
- Diagrams: render Mermaid server-side using `mermaid` + `puppeteer` headless, capture as PNG
- Store generated PDFs on S3, return download URL

---

## 9. VOICE INPUT IMPLEMENTATION

```typescript
// Two-tier voice strategy:
// Tier 1 (browser): Web Speech API for instant feedback
// Tier 2 (server): Send audio blob to Whisper for accuracy

// Frontend hook: useVoiceCapture.ts
const useVoiceCapture = () => {
  // 1. Start browser SpeechRecognition for live transcript
  // 2. Simultaneously record MediaRecorder audio blob
  // 3. On stop: send audio blob to /api/capture/voice
  // 4. Server transcribes with Whisper, returns cleaner transcript
  // 5. Show diff/confirmation to user before processing
}
```

---

## 10. IMAGE PROCESSING PIPELINE

```
User uploads image
       ↓
Frontend: compress & validate (max 10MB, JPEG/PNG/WEBP/HEIC)
       ↓
POST /api/capture/image (multipart)
       ↓
Server: upload to S3 → get URL
       ↓
Claude Vision API: send image URL + PARSE_SYSTEM_PROMPT
       ↓
Returns structured JSON question object
       ↓
Store in DB → return to frontend for preview
```

**Supported image types:**
- Exam papers (printed text + equations)
- Handwritten notes (Claude vision handles this well)
- Textbook pages
- Screenshots of digital content
- Whiteboard photos

---

## 11. SCALABILITY & MOBILE READINESS

### API-First Design
- All business logic lives in the server API
- Web frontend and future mobile app are thin clients
- Use the `packages/shared` folder for TypeScript types shared across all apps

### Mobile App Preparation
```
apps/mobile/               # Add React Native (Expo) or Flutter here
  ├── screens/             # Same screens, native UI
  ├── services/            # Reuse same API endpoints
  └── components/          # Native equivalents of web components
```

The backend API requires zero changes for mobile — just consume the same REST endpoints. Document the full API contract in `apps/mobile/API_CONTRACT.md`.

### Performance Considerations
- Use BullMQ queues for AI processing (prevent timeout on slow connections)
- Implement polling or WebSocket for job status if async
- Cache parsed questions in Redis (avoid re-parsing same image)
- Paginate all list endpoints (limit/offset or cursor-based)

### Multi-tenancy / SaaS Readiness
- Every DB query scoped by `userId` (enforced at middleware level)
- Add `planTier` to User model: `FREE | PRO | PREMIUM`
- Feature flags via a `FeatureFlags` service (check plan before AI calls)
- Free tier limits: 10 captures/month, 5 sessions/month

---

## 12. ENVIRONMENT VARIABLES

```bash
# .env.example

# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/questioncapture

# Redis
REDIS_URL=redis://localhost:6379

# Auth (Clerk)
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=

# AI
GEMINI_API_KEY=                    # Google Gemini API key
OPENAI_API_KEY=                    # For Whisper voice transcription (optional)

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-southeast-1
S3_BUCKET_NAME=questioncapture-files

# Optional: AssemblyAI (alternative to Whisper)
ASSEMBLYAI_API_KEY=
```

---

## 13. IMPLEMENTATION PHASES

### Phase 1 — Core MVP (Weeks 1–3)
**Goal:** Capture a question from text or image, parse it, start a tutor session.

- [ ] Monorepo setup (Turborepo + pnpm)
- [ ] Backend: Express + Prisma + PostgreSQL scaffold
- [ ] Auth: Clerk integration (web)
- [ ] `POST /api/capture/text` — text question parsing with Claude
- [ ] `POST /api/capture/image` — image upload → Claude Vision parsing
- [ ] `QuestionRenderer` component (text + equation + table)
- [ ] Tutor mode selector modal
- [ ] Session creation + basic chat (non-streaming)
- [ ] Session history list
- [ ] Basic styling with Tailwind

### Phase 2 — Polish & Voice (Weeks 4–5)
- [ ] SSE streaming for tutor responses
- [ ] Voice capture (Web Speech API + Whisper)
- [ ] Mermaid.js diagram rendering
- [ ] Self-attempt mode with answer submission + AI review
- [ ] Score display
- [ ] Session completion state

### Phase 3 — Export & Persistence (Week 6)
- [ ] PDF export with `@react-pdf/renderer`
- [ ] Server-side equation/diagram rendering for PDF
- [ ] S3 PDF storage + download link
- [ ] History filtering (subject, date, mode)

### Phase 4 — SaaS Features (Week 7–8)
- [ ] Subscription tiers (free/pro) — integrate Stripe
- [ ] Usage tracking + limits enforcement
- [ ] Dashboard analytics (questions, sessions, scores over time)
- [ ] User settings (preferred subject, difficulty preference)

### Phase 5 — Mobile (Post-MVP)
- [ ] React Native (Expo) app scaffold
- [ ] Camera capture (native)
- [ ] Voice capture (native)
- [ ] Shared API consumption
- [ ] Push notifications for session reminders

---

## 14. CLAUDE CODE COMMANDS TO GET STARTED

Run these in Claude Code after setting up the repo:

```bash
# 1. Scaffold monorepo
npx create-turbo@latest questioncapture --package-manager pnpm

# 2. Add web app
cd apps && pnpm create vite web --template react-ts

# 3. Add server
mkdir server && cd server && pnpm init
pnpm add express typescript @types/express prisma @prisma/client dotenv cors helmet @google/generative-ai

# 4. Setup Prisma
cd server && npx prisma init
# (paste schema from Section 4 above)
npx prisma migrate dev --name init

# 5. Install frontend deps
cd apps/web
pnpm add react-router-dom zustand @tanstack/react-query axios
pnpm add katex react-markdown mermaid
pnpm add react-dropzone
pnpm add @react-pdf/renderer
pnpm add -D tailwindcss @tailwindcss/typography

# 6. Run local dev
docker-compose up -d          # Start Postgres + Redis
pnpm dev                      # Start all apps via Turborepo
```

---

## 15. CRITICAL IMPLEMENTATION NOTES FOR CLAUDE CODE

1. **Always use `userId` from auth middleware** — never trust client-supplied userId
2. **Validate all AI JSON responses** with Zod before saving to DB — Gemini sometimes returns slightly malformed JSON or wraps in markdown code fences; strip them before parsing
3. **KaTeX rendering:** Use `dangerouslySetInnerHTML` only for KaTeX output (it's safe), not for user content
4. **Mermaid.js:** Initialize once globally, re-render on component mount — avoid re-initialization loops
5. **SSE streaming:** Set `Content-Type: text/event-stream`, `Cache-Control: no-cache`, disable response buffering with `res.flushHeaders()`
6. **File uploads:** Always virus-scan or at minimum validate MIME type server-side, not just client-side
7. **PDF equations:** `@react-pdf/renderer` doesn't support KaTeX natively — render equations to SVG string server-side (using `katex.renderToString`) and embed as SVG element in PDF
8. **Rate limiting:** Add `express-rate-limit` to AI endpoints from day one — Gemini API has per-minute quotas on the free tier
9. **Error boundaries:** Wrap `QuestionRenderer` in React Error Boundary — malformed parsed content must not crash the whole session
10. **Mobile readiness:** Never use `position: fixed` without accounting for mobile safe areas; use CSS env() variables from the start

---

## 16. SUGGESTED CLAUDE CODE PROMPT TO START

After reading this document, use the following prompt with Claude Code:

```
I'm building a micro-SaaS called QuestionCapture. 
Please read the instruction document I've provided and start by:

1. Setting up the monorepo with Turborepo and pnpm workspaces
2. Scaffolding the Express + TypeScript server with the Prisma schema from the spec
3. Setting up the React + TypeScript web app with Tailwind CSS and React Router
4. Implementing the first two API routes: POST /api/capture/text and POST /api/capture/image using the Gemini API (@google/generative-ai, model: gemini-2.0-flash)
5. Building the CaptureQuestion page and the QuestionRenderer component that handles text, equations (KaTeX), and tables

Use the folder structure, schema, and API specs from the instruction document exactly.
Ensure all TypeScript types are strict and shared via the packages/shared folder.
```

---

*Document version: 1.1 | Built for Claude Code | AI: Google Gemini | Scalable to mobile*
