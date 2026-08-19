import { getBankNifty } from "@/lib/yahoo";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  let initialData = null;
  try {
    initialData = await getBankNifty("6mo");
  } catch {
    initialData = null;
  }

  return <Dashboard initialData={initialData} />;
}

