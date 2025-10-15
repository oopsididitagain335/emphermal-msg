// app/api/room/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  // Generate secure unique ID (works in Edge & Node)
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  return NextResponse.json({ id, name: name.trim() });
}
