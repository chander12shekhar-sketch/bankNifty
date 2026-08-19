import { getBankNifty, isRangeKey } from "@/lib/yahoo";
import type { RangeKey } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("range") ?? "6mo";
  const range: RangeKey = isRangeKey(raw) ? raw : "6mo";

  try {
    const data = await getBankNifty(range);
    return Response.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Bank Nifty";
    return Response.json({ error: message }, { status: 502 });
  }
}
