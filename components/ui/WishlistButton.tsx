"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { sendGAEvent } from "@/lib/tracking";

export default function WishlistButton({
  itemType,
  itemId,
  className = "",
}: {
  itemType: "product" | "event" | "article" | "topic";
  itemId: string;
  className?: string;
}) {
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if already wishlisted on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("wishlist")
        .select("id")
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .maybeSingle();
      if (data) setWishlisted(true);
    })();
  }, [itemType, itemId]);

  const toggle = async () => {
    setLoading(true);
    try {
      if (wishlisted) {
        await supabase.from("wishlist").delete().eq("item_type", itemType).eq("item_id", itemId);
        setWishlisted(false);
      } else {
        await supabase.from("wishlist").insert({ item_type: itemType, item_id: itemId });
        setWishlisted(true);
        sendGAEvent("add_to_wishlist", { item_type: itemType, item_id: itemId });
      }
    } catch (e) {
      console.debug("[wishlist] error:", e);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`transition-transform hover:scale-110 ${className}`}
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: "1.2em", opacity: loading ? 0.5 : 1,
      }}
      aria-label={wishlisted ? "取消收藏" : "加入收藏"}
      title={wishlisted ? "取消收藏" : "加入收藏"}
    >
      {wishlisted ? "\u2764\uFE0F" : "\uD83D\uDDA4"}
    </button>
  );
}
