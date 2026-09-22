import type { RealtimeChannel } from "@supabase/supabase-js";

// The browser client reuses channels with the same topic. Each effect owns a
// fresh topic so concurrent mounts and asynchronous cleanup cannot interfere.
export function createOwnedRealtimeChannel(
  client: { channel: (topic: string) => RealtimeChannel },
  topic: string,
) {
  return client.channel(`${topic}:${crypto.randomUUID()}`);
}
