import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bank Nifty next move",
    short_name: "BankNifty",
    description:
      "On-demand NIFTY BANK next-move and options playbook from Yahoo Finance candles.",
    start_url: "/move",
    scope: "/",
    display: "standalone",
    background_color: "#0c0c0e",
    theme_color: "#0c0c0e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
