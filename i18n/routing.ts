import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";
import { locales, defaultLocale } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed", // zh 不加前綴，en/ja/ko 加前綴
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
