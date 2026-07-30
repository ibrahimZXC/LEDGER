import { createFileRoute } from "@tanstack/react-router";
import { EntityProfile } from "@/components/EntityProfile";

export const Route = createFileRoute("/suppliers/$id")({
  head: () => ({
    meta: [
      { title: "Supplier Account Statement — Business Ledger" },
      {
        name: "description",
        content: "Supplier profile, running balance and full transaction ledger.",
      },
      { property: "og:title", content: "Supplier Account Statement — Business Ledger" },
      {
        property: "og:description",
        content: "Supplier profile, running balance and full transaction ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupplierProfileRoute,
});

function SupplierProfileRoute() {
  const { id } = Route.useParams();
  return <EntityProfile id={id} type="supplier" />;
}
