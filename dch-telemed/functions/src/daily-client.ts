const DAILY_API = "https://api.daily.co/v1";

export interface DailyRoomResponse {
  name: string;
  url: string;
  created_at?: string;
  config?: Record<string, unknown>;
}

export interface DailyMeetingTokenResponse {
  token: string;
}

export async function dailyCreateRoom(
  apiKey: string,
  roomName: string,
  expSecondsFromNow: number
): Promise<DailyRoomResponse> {
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const res = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        exp,
        enable_screenshare: true,
        enable_chat: true,
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Daily create room failed: ${res.status} ${t}`);
  }
  return res.json() as Promise<DailyRoomResponse>;
}

export async function dailyCreateMeetingToken(
  apiKey: string,
  params: {
    roomName: string;
    isOwner: boolean;
    userName: string;
    exp: number;
  }
): Promise<string> {
  const res = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: params.roomName,
        is_owner: params.isOwner,
        user_name: params.userName,
        exp: params.exp,
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Daily meeting token failed: ${res.status} ${t}`);
  }
  const data = (await res.json()) as DailyMeetingTokenResponse;
  return data.token;
}
