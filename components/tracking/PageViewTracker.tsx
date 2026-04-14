"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView, sendGAEvent } from "@/lib/tracking";

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Don't track dev pages
    if (pathname.startsWith("/dev/")) return;

    // Determine content type from path
    let contentType: string | undefined;
    if (pathname.startsWith("/post/")) contentType = "article";
    else if (pathname.startsWith("/events/")) contentType = "event";
    else if (pathname.startsWith("/product/")) contentType = "product";
    else if (pathname.startsWith("/viewpoint/")) contentType = "topic";

    // Extract item ID from slug routes
    const slug = pathname.split("/").pop();
    const itemId = contentType && slug ? slug : undefined;

    trackPageView(pathname, contentType, itemId);

    // Also send to GA4
    sendGAEvent("page_view", {
      page_path: pathname,
      content_type: contentType,
      source: searchParams.get("liff_mode") === "true" ? "liff" : "web",
    });
  }, [pathname, searchParams]);

  return null;
}
