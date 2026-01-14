interface Env {
  ADMIN_EMAIL: string;
  SESSION_SECRET: string;
}

// Helper: Hash üretici (login ile aynı mantıkta olmalı)
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const cookieString = request.headers.get('Cookie');
  let sessionToken: string | null = null;

  if (cookieString) {
    const cookies = cookieString.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === 'cafunw_admin') {
        sessionToken = value;
        break;
      }
    }
  }

  if (!sessionToken) {
    return new Response(JSON.stringify({ ok: false }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Token doğrulama: (Email + Secret) hash'i cookie ile eşleşiyor mu?
  const expectedToken = await sha256(env.ADMIN_EMAIL + env.SESSION_SECRET);

  if (sessionToken === expectedToken) {
    return new Response(JSON.stringify({ 
      ok: true, 
      user: { email: env.ADMIN_EMAIL } 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify({ ok: false }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
