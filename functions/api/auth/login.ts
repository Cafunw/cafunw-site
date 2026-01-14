interface Env {
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SHA256: string;
  SESSION_SECRET: string;
}

// Helper: Metni SHA-256 hash'e çevirir (Hex string döner)
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Session için imza oluşturur
async function createSessionSignature(email: string, secret: string): Promise<string> {
  return await sha256(email + secret);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    const body: any = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Eksik bilgi.' }), { status: 400 });
    }

    // 1. Email Kontrolü
    if (email !== env.ADMIN_EMAIL) {
      return new Response(JSON.stringify({ ok: false, error: 'Giriş bilgileri geçersiz.' }), { status: 401 });
    }

    // 2. Şifre Kontrolü (WebCrypto SHA-256)
    const inputHash = await sha256(password);
    
    // Basit string karşılaştırması (Timing attack koruması istenirse crypto.subtle.timingSafeEqual kullanılabilir ama admin panel için opsiyonel)
    if (inputHash !== env.ADMIN_PASSWORD_SHA256) {
      return new Response(JSON.stringify({ ok: false, error: 'Giriş bilgileri geçersiz.' }), { status: 401 });
    }

    // 3. Session Token Oluşturma
    const token = await createSessionSignature(env.ADMIN_EMAIL, env.SESSION_SECRET);

    // 4. Cookie Hazırlama (7 gün)
    const cookieValue = `cafunw_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`;

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieValue
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Internal Server Error' }), { status: 500 });
  }
};
