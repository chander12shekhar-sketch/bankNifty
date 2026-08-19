import { getBankNifty } from "@/lib/yahoo";
import { MoveDesk } from "@/components/move-desk";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bank Nifty next move",
  description: "Mobile next-move and options playbook for NIFTY BANK.",
};

export const dynamic = "force-dynamic";

export default async function MovePage() {
  let initialData = null;
  try {
    initialData = await getBankNifty("6mo", { fresh: true });
  } catch {
    initialData = null;
  }

  return <MoveDesk initialData={initialData} />;
}
