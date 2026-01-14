interface Env {
  ADMIN_EMAIL: string;
  SESSION_SECRET: string;
}

// Login'deki ile aynı imza mantığı
async function verifySessionSignature(email: string, secret: string, tokenToCheck: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return tokenToCheck === expectedToken;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Cookie parsing
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

  // Cookie yoksa
  if (!sessionToken) {
    return new Response(JSON.stringify({ ok: false }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Cookie doğrulama
  const isValid = await verifySessionSignature(env.ADMIN_EMAIL, env.SESSION_SECRET, sessionToken);

  if (isValid) {
    return new Response(JSON.stringify({ 
      ok: true, 
      user: { email: env.ADMIN_EMAIL } 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    // Geçersiz cookie ise (eski session vs), 401 dön
    return new Response(JSON.stringify({ ok: false }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
