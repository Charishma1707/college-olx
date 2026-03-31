import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function RecoSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="w-[180px] shrink-0">
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4 mt-3" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
      ))}
    </div>
  );
}

export default function RecommendationStrip({ userId, onPickProduct }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch("/reco-api/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        const data = await res.json();
        if (!cancelled) setItems(data?.recommendations ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-extrabold mb-3">You may also like</h3>
      {loading ? (
        <RecoSkeleton />
      ) : items.length === 0 ? null : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items.map((p) => (
            <Card
              key={p.id}
              className="w-[180px] shrink-0 rounded-xl overflow-hidden border-0 shadow-md hover:shadow-xl transition-all cursor-pointer"
              onClick={() => onPickProduct?.(p.id)}
            >
              <img
                src={p.image}
                alt={p.name}
                className="h-[120px] w-full object-cover"
              />
              <CardContent className="p-3">
                <div className="font-semibold text-sm line-clamp-2">{p.name}</div>
                <div className="text-primary font-extrabold mt-2">${p.price}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

