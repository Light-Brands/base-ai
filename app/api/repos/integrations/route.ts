import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

interface RepoIntegration {
  vercel?: { projectId: string; projectName: string };
  supabase?: { projectRef: string; projectName: string };
}

interface RepoIntegrations {
  [repoFullName: string]: RepoIntegration;
}

function getRepoIntegrations(cookieStore: ReturnType<typeof cookies>): RepoIntegrations {
  const cookie = cookieStore.get('repo_integrations')?.value;
  if (!cookie) return {};
  try {
    return JSON.parse(cookie);
  } catch {
    return {};
  }
}

function setRepoIntegrations(response: NextResponse, integrations: RepoIntegrations) {
  response.cookies.set('repo_integrations', JSON.stringify(integrations), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
}

// GET - retrieve associations for a repo
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repo = searchParams.get('repo');

  const cookieStore = await cookies();
  const integrations = getRepoIntegrations(cookieStore);

  if (repo) {
    // Return specific repo's integrations
    return NextResponse.json({
      integrations: integrations[repo] || {},
    });
  }

  // Return all integrations
  return NextResponse.json({ integrations });
}

// POST - save an association
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo, vercel, supabase } = body;

    if (!repo) {
      return NextResponse.json({ error: 'repo is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const integrations = getRepoIntegrations(cookieStore);

    // Initialize repo entry if not exists
    if (!integrations[repo]) {
      integrations[repo] = {};
    }

    // Update vercel if provided
    if (vercel !== undefined) {
      if (vercel === null) {
        delete integrations[repo].vercel;
      } else {
        integrations[repo].vercel = vercel;
      }
    }

    // Update supabase if provided
    if (supabase !== undefined) {
      if (supabase === null) {
        delete integrations[repo].supabase;
      } else {
        integrations[repo].supabase = supabase;
      }
    }

    // Clean up empty entries
    if (Object.keys(integrations[repo]).length === 0) {
      delete integrations[repo];
    }

    const response = NextResponse.json({ success: true, integrations: integrations[repo] || {} });
    setRepoIntegrations(response, integrations);
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE - remove an association
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo, service } = body;

    if (!repo || !service) {
      return NextResponse.json({ error: 'repo and service are required' }, { status: 400 });
    }

    if (service !== 'vercel' && service !== 'supabase') {
      return NextResponse.json({ error: 'service must be "vercel" or "supabase"' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const integrations = getRepoIntegrations(cookieStore);

    if (integrations[repo]) {
      const serviceKey = service as 'vercel' | 'supabase';
      delete integrations[repo][serviceKey];

      // Clean up empty entries
      if (Object.keys(integrations[repo]).length === 0) {
        delete integrations[repo];
      }
    }

    const response = NextResponse.json({ success: true });
    setRepoIntegrations(response, integrations);
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
