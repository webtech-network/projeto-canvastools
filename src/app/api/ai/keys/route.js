import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { listProviders } from '@/lib/aiProviders';

// Deliberate, user-approved exception to the rest of the app's "AI API keys
// are write-only" design (see key/route.js — no other route anywhere under
// src/app/api/ai/ ever returns a key's plaintext value). This one exists
// solely to feed the combined settings export (src/lib/settingsExport.js),
// which requires the caller to set a password and encrypts the whole bundle
// (src/lib/settingsCrypto.js) before it ever touches disk — the plaintext
// values never leave this response except into that encryption step.
export async function GET() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const keys = {};
  for (const provider of listProviders()) {
    const value = session.aiApiKeys?.[provider.id];
    if (value) keys[provider.id] = value;
  }

  return NextResponse.json({ keys });
}
