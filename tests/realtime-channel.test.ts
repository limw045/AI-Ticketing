import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createOwnedRealtimeChannel } from "../lib/supabase/realtime-channel";

describe("effect-owned realtime channels", () => {
  it.each(["notifications:user-1", "ticket-discussion:ticket-1"])(
    "isolates simultaneous mounts and remounts for %s",
    async (topic) => {
      const client = createClient("https://example.supabase.co", "test-key", {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      // Verify the real SDK's same-topic reuse that caused the regression.
      const shared = client.channel(topic);
      expect(client.channel(topic)).toBe(shared);
      await client.removeChannel(shared);

      const desktop = createOwnedRealtimeChannel(client, topic);
      const mobile = createOwnedRealtimeChannel(client, topic);
      expect(desktop).not.toBe(mobile);
      expect(desktop.topic).not.toBe(mobile.topic);

      // A replacement must remain independent even before old cleanup finishes.
      const cleanup = client.removeChannel(desktop);
      const remount = createOwnedRealtimeChannel(client, topic);
      await cleanup;
      expect(client.getChannels()).toEqual([mobile, remount]);
      expect(remount.topic).not.toBe(desktop.topic);
      await client.removeAllChannels();
      expect(client.getChannels()).toEqual([]);
    },
  );
});
