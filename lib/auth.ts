export function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "access_token") {
      return decodeURIComponent(value);
    }
  }

  console.warn("No access_token found in cookies");
  return null;
}

export function getUserFromToken(token: string): any | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    // Kiểm tra token còn hạn
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return {
      id: payload.sub,
      username: payload.username || "",
      fullName: payload.fullName || "",
      status: "active" as const,
      isBlock: false,
      roles: payload.roles || [],
      departments: payload.departments || [],
    };
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
  }
}

export function getUserRolesFromToken(token: string): string[] {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    // Kiểm tra token còn hạn
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return [];
    }

    if (payload.roles && Array.isArray(payload.roles)) {
      return payload.roles.map((role: any) => role.name || role);
    }

    return [];
  } catch (error) {
    console.error("Token decode error:", error);
    return [];
  }
}

export function setAccessToken(token: string) {
  if (typeof document !== "undefined") {
    // Set cookie with 7 days expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    document.cookie = `access_token=${encodeURIComponent(token)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  }
}

export function clearAccessToken() {
  if (typeof document !== "undefined") {
    document.cookie =
      "access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
  }
}
