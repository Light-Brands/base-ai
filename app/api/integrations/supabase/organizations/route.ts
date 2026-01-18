import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('supabase_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated with Supabase PAT' }, { status: 401 });
  }

  try {
    // Fetch organizations
    const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!orgsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: orgsRes.status });
    }

    const orgs = await orgsRes.json();

    const organizations = orgs.map((org: { id: string; name: string }) => ({
      id: org.id,
      name: org.name,
    }));

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Error fetching Supabase orgs:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}
