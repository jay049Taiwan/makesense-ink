import liff from "@line/liff";

let initialized = false;

export async function initLiff(): Promise<boolean> {
  if (initialized) return true;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) { console.warn("LIFF ID not configured"); return false; }
  try {
    await liff.init({ liffId });
    initialized = true;
    return true;
  } catch (err) {
    console.error("LIFF init failed:", err);
    return false;
  }
}

export function isInLineClient(): boolean {
  return initialized && liff.isInClient();
}

export async function getLiffProfile() {
  if (!initialized) return null;
  try {
    return await liff.getProfile();
  } catch { return null; }
}

export function getLiffAccessToken(): string | null {
  if (!initialized) return null;
  return liff.getAccessToken();
}

export function liffLogin() {
  if (!initialized) return;
  if (!liff.isLoggedIn()) {
    liff.login();
  }
}

export function liffLogout() {
  if (!initialized) return;
  if (liff.isLoggedIn()) {
    liff.logout();
    window.location.reload();
  }
}

export function closeLiff() {
  if (initialized && liff.isInClient()) {
    liff.closeWindow();
  }
}

export { liff };
