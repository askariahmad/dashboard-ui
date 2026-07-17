const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const msalConfig = {
  auth: {
    clientId: isLocal ? "11111111-1111-1111-1111-111111111111" : "YOUR_ENTRA_CLIENT_ID",
    authority: isLocal ? "https://localhost:4577/00000000-0000-0000-0000-000000000002" : "https://login.microsoftonline.com/YOUR_TENANT_ID",
    redirectUri: window.location.origin,
    validateAuthority: !isLocal,
    knownAuthorities: isLocal ? ["localhost:4577", "localhost"] : []
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

export const loginRequest = {
  scopes: ["User.Read"]
};
