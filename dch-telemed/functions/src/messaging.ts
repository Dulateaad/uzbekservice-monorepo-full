/**
 * Интеграция ChatApp / WhatsApp: реальный URL и заголовки задайте через секреты/ENV.
 * При отсутствии конфигурации — только лог, без выброса ошибки (удобно для dev).
 */
export async function sendAppointmentJoinLink(params: {
  toPhone: string;
  patientName?: string;
  joinUrl: string;
  appointmentId: string;
}): Promise<{ ok: boolean; skipped?: boolean; detail?: string }> {
  const apiUrl = process.env.MESSAGING_API_URL?.trim();
  const apiKey = process.env.MESSAGING_API_KEY?.trim();

  const text =
    `Здравствуйте${params.patientName ? `, ${params.patientName}` : ""}. ` +
    `Онлайн-консультация. Подключитесь по ссылке: ${params.joinUrl}`;

  if (!apiUrl || !apiKey) {
    console.log("[messaging] skip (no MESSAGING_API_URL / MESSAGING_API_KEY)", {
      to: params.toPhone,
      text,
      appointmentId: params.appointmentId,
    });
    return { ok: true, skipped: true, detail: "messaging_not_configured" };
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: params.toPhone,
        text,
        appointmentId: params.appointmentId,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, detail: `${res.status} ${t}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}
