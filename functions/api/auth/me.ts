interface Env {
  ADMIN_EMAIL: string;
  SESSION_SECRET: string;
}

// Helper
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

  // Env Email'i normalize et (Login'deki mantıkla aynı olmalı)
  const adminEmail = String(env.ADMIN_EMAIL || "").trim().toLowerCase();
  
  // Beklenen token'ı üret
  const expectedToken = await sha256(adminEmail + env.SESSION_SECRET);

  if (sessionToken === expectedToken) {
    return new Response(JSON.stringify({ 
      ok: true, 
      // Kullanıcıya orijinal env değerini veya normalize halini dönebilirsin
      user: { email: adminEmail } 
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
