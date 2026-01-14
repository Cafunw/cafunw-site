export const onRequestPost: PagesFunction = async () => {
  // Cookie silme (Max-Age=0)
  const cookieValue = `cafunw_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieValue
    }
  });
};
