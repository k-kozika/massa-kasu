import type { APIRoute } from "astro";
import { ContentClient } from "../lib/blog";

export const POST: APIRoute = async (context) => {
  try {
    const { env } = context.locals.runtime;
    const signature = context.request.headers.get("X-MICROCMS-Signature") ?? "";
    const requestText = await context.request.text();
    ContentClient.webhookDelete(
      requestText,
      {
        key: env.WEBHOOK_SECRET,
        signature,
      },
      env.KV
    );
    return new Response(JSON.stringify({ ok: 1 }));
  } catch (error) {
    return new Response(null, { status: 500 });
  }
};
