/**
 * Dev 角色切換用 profile — 僅 DevRoleProvider 使用
 * 正式環境不會載入此檔案
 */

export const MOCK_PROFILES = {
  member: {
    displayName: "王大明",
    email: "wangdaming@gmail.com",
    phone: "0912-345-678",
    lineUid: "U1234567890abcdef",
    lineConnected: true,
  },
  staff: {
    displayName: "林四九",
    email: "jay049@gmail.com",
    phone: "0988-049-049",
    lineUid: "U1238838c4a865f4160f974802671a2f8",
    lineConnected: true,
  },
  vendor: {
    displayName: "旅人書店",
    email: "travelerbookstore@gmail.com",
    phone: "039-325957",
    lineUid: "",
    lineConnected: false,
  },
};
