# Lawless AI - CLI/SDK Routing Architecture Plan

> **Document Purpose**: Comprehensive analysis of options for running Claude CLI through the SDK, with architecture recommendations for local development, Vercel frontend + remote backend, and Oracle Cloud hosting.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [The Core Problem](#2-the-core-problem)
3. [Architecture Options Overview](#3-architecture-options-overview)
4. [Option A: Quick & Efficient Solution](#4-option-a-quick--efficient-solution)
5. [Option B: 100% Scalable SDK Solution](#5-option-b-100-scalable-sdk-solution)
6. [Option C: Hybrid Architecture](#6-option-c-hybrid-architecture)
7. [Oracle Cloud Free Tier Analysis](#7-oracle-cloud-free-tier-analysis)
8. [Local Development Setup](#8-local-development-setup)
9. [Implementation Checklist](#9-implementation-checklist)
10. [Recommendation Summary](#10-recommendation-summary)

---

## 1. Current State Analysis

### How AI Routing Works Today

```
┌─────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Browser (page.tsx)                                        │
│        │                                                    │
│        ↓ POST /api/chat                                     │
│                                                             │
│   Next.js API Route (route.ts)                              │
│        │                                                    │
│        ↓ spawn('claude', ['-p', prompt])                    │
│                                                             │
│   Claude CLI Subprocess                                     │
│        │                                                    │
│        ↓ SSE Stream                                         │
│                                                             │
│   Browser (real-time updates)                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Files:**
- `app/api/chat/route.ts` - Spawns Claude CLI subprocess
- `lib/conversations.ts` - In-memory conversation state
- `lib/constants.ts` - System prompt (Lawless AI persona)
- `app/page.tsx` - Frontend with SSE streaming

### Current Limitations

| Issue | Impact |
|-------|--------|
| CLI spawning requires Node.js runtime | Cannot run on Vercel serverless |
| In-memory conversation storage | Data lost on restart |
| Single subprocess per request | No horizontal scaling |
| CLI must be installed on server | Deployment complexity |

---

## 2. The Core Problem

**Your frontend is on Vercel, but Vercel cannot spawn the Claude CLI.**

Vercel's serverless functions:
- Have no persistent filesystem
- Cannot spawn child processes reliably
- Have cold start latency
- Have 60-second timeout limits (your current config)

**We need to separate concerns:**
1. **Frontend** (Vercel) - UI, static assets, PWA
2. **AI Backend** (Remote) - Claude CLI/SDK execution

---

## 3. Architecture Options Overview

| Option | Complexity | Cost | Scalability | Best For |
|--------|------------|------|-------------|----------|
| **A: Quick Proxy** | Low | Free (Oracle) | Limited | MVP, Testing |
| **B: Full SDK** | High | $0.05/hr containers | Unlimited | Production |
| **C: Hybrid** | Medium | Free-Low | Good | Most users |

---

## 4. Option A: Quick & Efficient Solution

### "Get it working now" approach

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                         │
│                                                             │
│   Next.js App (Static + Edge)                               │
│   - React UI with PWA                                       │
│   - Edge Function: Proxy to backend                         │
│                                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              ORACLE CLOUD (Always Free Tier)                 │
│                                                             │
│   Ampere A1 Instance (4 OCPU / 24GB RAM available)          │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Node.js Express Server                             │   │
│   │  - Receives proxied requests                        │   │
│   │  - spawn('claude', ['-p', prompt])                  │   │
│   │  - Streams response via SSE                         │   │
│   │  - SQLite for conversation persistence              │   │
│   └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ↓                                   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Claude CLI (Authenticated)                         │   │
│   │  - Uses your Claude subscription                    │   │
│   │  - No API costs                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Create Backend Server (Oracle)

Create `backend/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import Database from 'better-sqlite3';

const app = express();
const db = new Database('conversations.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    session_id TEXT PRIMARY KEY,
    messages TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-app.vercel.app',
  credentials: true
}));
app.use(express.json());

// API key validation
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.BACKEND_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  // Get conversation history
  const row = db.prepare('SELECT messages FROM conversations WHERE session_id = ?').get(sessionId);
  const history = row ? JSON.parse(row.messages) : [];

  // Add user message
  history.push({ role: 'user', content: message });

  // Build prompt
  const fullPrompt = buildPromptWithHistory(history);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Spawn Claude CLI
  const claude = spawn('claude', ['-p', fullPrompt], {
    env: { ...process.env, NO_COLOR: '1' }
  });

  let responseContent = '';

  claude.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    responseContent += text;
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
  });

  claude.stderr.on('data', (data) => {
    console.error('Claude stderr:', data.toString());
  });

  claude.on('close', (code) => {
    if (code === 0) {
      // Save to database
      history.push({ role: 'assistant', content: responseContent });
      db.prepare(`
        INSERT OR REPLACE INTO conversations (session_id, messages, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(sessionId, JSON.stringify(history));

      res.write(`data: ${JSON.stringify({ type: 'done', content: responseContent })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Claude process failed' })}\n\n`);
    }
    res.end();
  });
});

app.listen(3001, () => {
  console.log('Backend running on port 3001');
});
```

#### Step 2: Modify Frontend API Route

Update `app/api/chat/route.ts` to proxy to backend:

```typescript
export const runtime = 'edge'; // Now can run on Vercel Edge

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Proxy to Oracle backend
  const backendUrl = process.env.BACKEND_URL || 'https://your-oracle-server.com';

  const response = await fetch(`${backendUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.BACKEND_API_KEY!
    },
    body: JSON.stringify(body)
  });

  // Forward the SSE stream
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

### Pros & Cons

| Pros | Cons |
|------|------|
| Minimal code changes | Single point of failure |
| Uses existing CLI auth | Limited to one server |
| Free hosting (Oracle) | Must manage server manually |
| Works immediately | No auto-scaling |
| Keeps Vercel frontend | CLI updates require SSH |

### Cost: FREE

Oracle Always Free Tier covers everything.

---

## 5. Option B: 100% Scalable SDK Solution

### "Production-ready, enterprise-scale" approach

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                         │
│                                                             │
│   Next.js App + Vercel AI SDK                               │
│   - useChat() hook for streaming                            │
│   - Edge functions for request routing                      │
│                                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              CONTAINER ORCHESTRATION (Modal/Fly.io)          │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  API Gateway                                        │   │
│   │  - Rate limiting                                    │   │
│   │  - Authentication                                   │   │
│   │  - Request routing                                  │   │
│   └─────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│   ┌─────────────────────┼───────────────────────────────┐   │
│   │                     ↓                               │   │
│   │   ┌─────────────────────────────────────────────┐   │   │
│   │   │  Ephemeral Agent Container (spawned on      │   │   │
│   │   │  demand)                                     │   │   │
│   │   │                                             │   │   │
│   │   │  - Claude Agent SDK                         │   │   │
│   │   │  - Full tool access (Bash, Read, Edit...)   │   │   │
│   │   │  - Isolated filesystem                      │   │   │
│   │   │  - Auto-terminates when complete            │   │   │
│   │   └─────────────────────────────────────────────┘   │   │
│   │                     ×N (scales horizontally)        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              STATE & PERSISTENCE                             │
│                                                             │
│   - Redis (session state)                                   │
│   - PostgreSQL (conversation history)                       │
│   - S3/Object Storage (file artifacts)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation with Claude Agent SDK

Create `agent-service/index.ts`:

```typescript
import { query, ClaudeAgentOptions } from '@anthropic-ai/claude-agent-sdk';
import express from 'express';

const app = express();

app.post('/api/agent/task', async (req, res) => {
  const { prompt, sessionId, systemPrompt } = req.body;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const options: ClaudeAgentOptions = {
    systemPrompt: systemPrompt || LAWLESS_SYSTEM_PROMPT,
    allowedTools: ['Read', 'WebSearch', 'WebFetch'],
    permissionMode: 'auto', // Auto-approve safe operations
    model: 'claude-sonnet-4-20250514', // Or 'claude-opus-4-5-20251101' for complex tasks
    maxTurns: 10
  };

  try {
    for await (const message of query({ prompt, options })) {
      if (message.type === 'assistant') {
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          content: message.message?.content
        })}\n\n`);
      } else if (message.type === 'result') {
        res.write(`data: ${JSON.stringify({
          type: 'done',
          result: message
        })}\n\n`);
      }
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
  }

  res.end();
});
```

### Vercel AI SDK Integration

Update frontend to use Vercel AI SDK:

```typescript
// app/page.tsx
'use client';

import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    streamProtocol: 'data' // For SSE streaming
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          {m.role}: {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

### Container Hosting Options

| Platform | Pricing | Pros | Cons |
|----------|---------|------|------|
| **Modal** | Pay-per-second | Auto-scaling, GPU support | Learning curve |
| **Fly.io** | $0.0000045/s CPU | Global edge, simple | Limited GPU |
| **Railway** | $5/mo + usage | Easy deploy | Less control |
| **Render** | $7/mo | Background workers | Cold starts |

### Pros & Cons

| Pros | Cons |
|------|------|
| Infinite horizontal scaling | Higher complexity |
| Full Agent SDK capabilities | API costs apply |
| Isolated execution per request | Container startup latency |
| Professional-grade reliability | More infrastructure to manage |
| Resume sessions across requests | Requires database for state |

### Cost Estimate

- **Containers**: ~$0.05/hour when active
- **Anthropic API**: ~$3/M input tokens, $15/M output tokens (Sonnet)
- **Database**: ~$5-15/month (managed PostgreSQL)
- **Total**: Varies by usage, typically $20-100/month for moderate use

---

## 6. Option C: Hybrid Architecture

### "Best of both worlds" approach

This option keeps your **CLI-based approach** (no API costs) but adds **scalability and reliability**.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                         │
│   - Static React app                                        │
│   - Edge function proxy                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              ORACLE CLOUD (Always Free)                      │
│                                                             │
│   Instance 1: API Gateway + Load Balancer                   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Nginx + PM2                                        │   │
│   │  - SSL termination                                  │   │
│   │  - Rate limiting                                    │   │
│   │  - Health checks                                    │   │
│   │  - Request queuing                                  │   │
│   └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ↓                                   │
│   Instance 2: Worker Pool                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  PM2 Cluster Mode (multiple workers)                │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│   │  │Worker 1 │ │Worker 2 │ │Worker 3 │ │Worker 4 │   │   │
│   │  │(claude) │ │(claude) │ │(claude) │ │(claude) │   │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│   └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ↓                                   │
│   Shared: PostgreSQL + Redis                                 │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  - Conversation persistence (PostgreSQL)            │   │
│   │  - Request queue (Redis/BullMQ)                     │   │
│   │  - Session cache (Redis)                            │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Request Queuing**: Handle bursts without dropping requests
2. **Worker Pool**: Multiple Claude CLI instances
3. **Health Monitoring**: Auto-restart failed workers
4. **Persistent Storage**: Conversations survive restarts

### PM2 Ecosystem Config

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './dist/gateway.js',
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'claude-worker',
      script: './dist/worker.js',
      instances: 4, // 4 concurrent Claude processes
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### Pros & Cons

| Pros | Cons |
|------|------|
| No API costs (uses CLI) | Limited to Oracle's free resources |
| Multiple concurrent requests | More complex than Option A |
| Persistent conversations | Still single-region |
| Free hosting | Manual scaling |
| Queue handles traffic spikes | Requires PM2 management |

### Cost: FREE

All within Oracle Always Free Tier.

---

## 7. Oracle Cloud Free Tier Analysis

### Available Resources (Always Free, Forever)

| Resource | Quantity | Notes |
|----------|----------|-------|
| **Ampere A1 VMs** | 4 OCPUs + 24GB RAM total | Can split across up to 4 instances |
| **AMD E2.1.Micro** | 2 instances | 1/8 OCPU + 1GB RAM each |
| **Block Storage** | 200GB total | SSD performance |
| **Object Storage** | 10GB | For backups |
| **Load Balancer** | 1 flexible (10Mbps) | For HA setups |
| **Bandwidth** | 10TB/month outbound | More than enough |

### Recommended Allocation for Lawless AI

**Option A (Simple):**
```
1x Ampere A1 (2 OCPU, 12GB RAM)
├── Node.js API server
├── Claude CLI
├── SQLite database
└── Nginx reverse proxy
```

**Option C (Hybrid):**
```
Instance 1: Ampere A1 (1 OCPU, 6GB RAM)
├── Nginx (gateway)
├── Redis (queue)
└── PostgreSQL

Instance 2: Ampere A1 (3 OCPU, 18GB RAM)
├── PM2 cluster
└── 4x Claude CLI workers
```

### Setup Commands

```bash
# Install on Oracle Ampere A1 (Ubuntu 22.04)

# 1. System updates
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install Claude CLI
curl -fsSL https://claude.ai/install.sh | bash

# 4. Authenticate Claude
claude  # Follow prompts to authenticate

# 5. Install PM2
sudo npm install -g pm2

# 6. Clone your backend
git clone https://github.com/your-repo/lawless-ai-backend.git
cd lawless-ai-backend
npm install
npm run build

# 7. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 8. Setup Nginx
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/lawless-ai
# (add reverse proxy config)
sudo ln -s /etc/nginx/sites-available/lawless-ai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. SSL with Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Important: Prevent Idle Reclamation

Oracle reclaims instances with <20% CPU over 7 days. Add a keep-alive cron:

```bash
# /etc/cron.d/keep-alive
*/5 * * * * root dd if=/dev/zero of=/dev/null bs=1M count=100
```

---

## 8. Local Development Setup

### Prerequisites

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **Claude CLI**
   ```bash
   # macOS/Linux
   curl -fsSL https://claude.ai/install.sh | bash

   # Verify installation
   claude --version
   ```

3. **Claude Authentication**
   ```bash
   claude  # Follow prompts to authenticate with Claude.ai account
   ```

### Running Locally

```bash
# Clone the repo
git clone https://github.com/Light-Brands/lawless-ai.git
cd lawless-ai

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Environment Variables

Create `.env.local`:

```env
# For Option A/C (backend proxy)
BACKEND_URL=http://localhost:3001
BACKEND_API_KEY=your-secret-key

# For Option B (API SDK)
ANTHROPIC_API_KEY=sk-ant-your-api-key
```

### Testing the Setup

```bash
# Test Claude CLI directly
claude -p "Say hello"

# Test the API route
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "sessionId": "test-123"}'
```

---

## 9. Implementation Checklist

### Option A: Quick & Efficient

- [ ] Create Oracle Cloud account (free)
- [ ] Provision Ampere A1 instance
- [ ] Install Node.js and Claude CLI
- [ ] Authenticate Claude CLI
- [ ] Deploy backend server code
- [ ] Configure Nginx + SSL
- [ ] Update Vercel environment variables
- [ ] Modify `/api/chat` to proxy mode
- [ ] Test end-to-end

### Option B: Scalable SDK

- [ ] Set up Anthropic API account
- [ ] Install Claude Agent SDK
- [ ] Create container service (Modal/Fly.io)
- [ ] Implement agent task endpoint
- [ ] Set up PostgreSQL for state
- [ ] Install Vercel AI SDK
- [ ] Refactor frontend to use `useChat()`
- [ ] Deploy and test

### Option C: Hybrid

- [ ] Complete Option A checklist first
- [ ] Add second Oracle instance
- [ ] Install Redis + PostgreSQL
- [ ] Implement worker queue with BullMQ
- [ ] Configure PM2 cluster mode
- [ ] Set up health monitoring
- [ ] Add request queuing logic
- [ ] Load test concurrent requests

---

## 10. Recommendation Summary

### Decision Matrix

| If you need... | Choose | Why |
|----------------|--------|-----|
| **Working today, minimal effort** | Option A | 2-3 hours to deploy |
| **Production scale, budget available** | Option B | Enterprise-ready |
| **Free + reliable + some scale** | Option C | Best value |
| **Learning/experimentation** | Local only | Zero cost |

### My Recommendation

**Start with Option A, plan for Option C.**

1. **Week 1**: Deploy Option A on Oracle Cloud
   - Get everything working end-to-end
   - Validate the architecture
   - Test with real users

2. **Week 2-3**: Upgrade to Option C
   - Add worker pool for concurrency
   - Add PostgreSQL for persistence
   - Add Redis for queuing

3. **Future**: Consider Option B when:
   - You need Agent SDK features (file editing, code execution)
   - Traffic exceeds free tier capacity
   - You need multi-region deployment

### Quick Start Command

```bash
# Create the backend directory structure
mkdir -p backend/src
cd backend
npm init -y
npm install express cors better-sqlite3 dotenv
npm install -D typescript @types/node @types/express ts-node

# Start building!
```

---

## Questions to Consider

Before choosing, answer these:

1. **How many concurrent users do you expect?**
   - <10: Option A
   - 10-50: Option C
   - 50+: Option B

2. **Is zero API cost essential?**
   - Yes: Option A or C
   - No: Option B

3. **Do you need Agent SDK features?**
   - File editing, code execution, web search: Option B
   - Simple chat: Option A or C

4. **What's your deployment timeline?**
   - Today: Option A
   - This week: Option C
   - This month: Option B

---

*Document created: January 2026*
*Last updated: January 2026*
*Author: Claude (Opus 4.5)*
