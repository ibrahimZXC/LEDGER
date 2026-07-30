import { createFileRoute } from "@tanstack/react-router";
import { EntityList } from "@/components/EntityList";

export const Route = createFileRoute("/suppliers/")({
  head: () => ({
    meta: [
      { title: "Suppliers — Business Ledger" },
      { name: "description", content: "Track suppliers, payables and purchase history." },
      { property: "og:title", content: "Suppliers — Business Ledger" },
      { property: "og:description", content: "Track suppliers, payables and purchase history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <EntityList type="supplier" />,
});
