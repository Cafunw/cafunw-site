import bcrypt from 'bcryptjs';

interface Env {
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
}

// Session imzası oluşturmak için yardımcı fonksiyon (SHA-256)
async function createSessionSignature(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    // Body parse
    const body: any = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Eksik bilgi.' }), { status: 400 });
    }

    // 1. Email Kontrolü
    if (email !== env.ADMIN_EMAIL) {
      return new Response(JSON.stringify({ ok: false, error: 'Giriş bilgileri geçersiz.' }), { status: 401 });
    }

    // 2. Şifre Kontrolü (bcrypt)
    const match = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
    if (!match) {
      return new Response(JSON.stringify({ ok: false, error: 'Giriş bilgileri geçersiz.' }), { status: 401 });
    }

    // 3. Session Token Oluşturma (Stateless imza)
    const token = await createSessionSignature(env.ADMIN_EMAIL, env.SESSION_SECRET);

    // 4. Cookie Hazırlama
    // 7 Gün = 60 * 60 * 24 * 7 = 604800 saniye
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
