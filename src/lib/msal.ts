import { PublicClientApplication, type Configuration } from '@azure/msal-browser'

const msalConfig: Configuration = {
  auth: {
    clientId:    import.meta.env.VITE_MS_CLIENT_ID,
    authority:   `https://login.microsoftonline.com/${import.meta.env.VITE_MS_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

export const LOGIN_SCOPES = ['User.Read']
