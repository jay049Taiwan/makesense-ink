import { redirect } from "next/navigation";

// 保持舊連結相容：/terms → /legal/服務條款
export default function TermsPage() {
  redirect("/legal/%E6%9C%8D%E5%8B%99%E6%A2%9D%E6%AC%BE");
}
