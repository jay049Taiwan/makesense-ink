/**
 * Gmail 視 jay.049@gmail.com === jay049@gmail.com（@前的點號忽略）
 * 其他網域不能亂動點號，會誤傷
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  const trimmed = email.trim().toLowerCase();
  const atIdx = trimmed.indexOf("@");
  if (atIdx < 0) return trimmed;
  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return local.replace(/\./g, "") + "@gmail.com";
  }
  return trimmed;
}
