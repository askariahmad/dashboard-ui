const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// TODO: Replace with your Azure AD app registration values
const ENTRA_CLIENT_ID = "<YOUR_CLIENT_ID>";
const ENTRA_TENANT_ID = "<YOUR_TENANT_ID>";

export const msalConfig = {
  auth: {
    clientId: ENTRA_CLIENT_ID,
    authority: isLocal
      ? `https://localhost:4577/${ENTRA_TENANT_ID}`
      : `https://login.microsoftonline.com/${ENTRA_TENANT_ID}`,
    redirectUri: window.location.origin,
    validateAuthority: !isLocal,
    knownAuthorities: isLocal ? ["localhost"] : []
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

export const loginRequest = {
  scopes: ["User.Read"]
};
