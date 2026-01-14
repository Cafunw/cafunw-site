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

// Helper: Session imzası
async function createSessionSignature(email: string, secret: string): Promise<string> {
  return await sha256(email + secret);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    // Body parse işlemini güvenli hale getir
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400 });
    }

    // 1. Email Normalizasyonu ve Kontrolü
    const inputEmail = String(body.email || "").trim().toLowerCase();
    const adminEmail = String(env.ADMIN_EMAIL || "").trim().toLowerCase();

    if (!inputEmail || inputEmail !== adminEmail) {
      // Güvenlik için detay vermeden genel hata
      return new Response(JSON.stringify({ ok: false, error: 'Giriş bilgileri geçersiz.' }), { status: 401 });
    }

    // 2. Şifre Normalizasyonu ve Kontrolü
    const inputPw = String(body.password || "").trim(); // Şifrede trim yapılmaz, kullanıcı boşluklu şifre seçmiş olabilir
    
    // Hash üret
    const inputHashRaw = await sha256(inputPw);
    
    // Hash karşılaştırması (Case-insensitive ve trim'li)
    const got = inputHashRaw.trim().toLowerCase();
    const expected = String(env.ADMIN_PASSWORD_SHA256 || "").trim().toLowerCase();

    if (got !== expected) {
      return new Response(JSON.stringify({ ok: false, error: 'Giriş bilgileri geçersiz.' }), { status: 401 });
    }

    // 3. Session Token Oluşturma (Normalize edilmiş email ile)
    const token = await createSessionSignature(adminEmail, env.SESSION_SECRET);

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
