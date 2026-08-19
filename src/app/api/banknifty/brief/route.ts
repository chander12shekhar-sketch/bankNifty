import { formatBrief } from "@/lib/brief";
import { getBankNifty } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const data = await getBankNifty("6mo", { fresh: true });
    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("text/plain") || new URL(request.url).searchParams.get("format") === "text") {
      return new Response(formatBrief(data), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    return Response.json(
      { ...data, brief: formatBrief(data) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build Bank Nifty brief";
    return Response.json({ error: message }, { status: 502 });
  }
}
