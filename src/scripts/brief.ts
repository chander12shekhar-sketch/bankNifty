import { formatBrief } from "../lib/brief";
import { getBankNifty } from "../lib/yahoo";

async function main() {
  const data = await getBankNifty("6mo", { fresh: true });
  process.stdout.write(formatBrief(data) + "\n");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Brief failed";
  process.stderr.write(message + "\n");
  process.exit(1);
});
