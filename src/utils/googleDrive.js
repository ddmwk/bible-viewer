const CLIENT_ID = '191842721298-8hl4o12vvk31m8t0kunc4keo50d527k6.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

let tokenClient;
let gapiInited = false;
let gisInited = false;

export const initClient = (onInitComplete) => {
  // 1. Load GAPI (for API requests)
  const gapiScript = document.createElement('script');
  gapiScript.src = "https://apis.google.com/js/api.js";
  gapiScript.async = true;
  gapiScript.defer = true;
  gapiScript.onload = () => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS,
      });
      gapiInited = true;
      checkLoaded(onInitComplete);
    });
  };
  document.body.appendChild(gapiScript);

  // 2. Load GIS (for Authentication)
  const gisScript = document.createElement('script');
  gisScript.src = "https://accounts.google.com/gsi/client";
  gisScript.async = true;
  gisScript.defer = true;
  gisScript.onload = () => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
           // Auth successful, proceed
           if (onSignInSuccessCallback) onSignInSuccessCallback(true);
        }
      },
    });
    gisInited = true;
    checkLoaded(onInitComplete);
  };
  document.body.appendChild(gisScript);
};

const checkLoaded = (callback) => {
  if (gapiInited && gisInited) {
    callback(false); // Initially false (not signed in)
  }
};

let onSignInSuccessCallback = null;

export const signIn = (onSuccess) => {
  onSignInSuccessCallback = onSuccess;
  if(tokenClient) {
      tokenClient.requestAccessToken({prompt: 'consent'});
  }
};

export const signOut = (onSignOut) => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      window.gapi.client.setToken('');
      if(onSignOut) onSignOut();
    });
  } else {
      if(onSignOut) onSignOut();
  }
};

// List files
export const listFiles = async (folderId) => {
  try {
    const response = await window.gapi.client.drive.files.list({
      'pageSize': 1000,
      'fields': "nextPageToken, files(id, name, mimeType)",
      'q': `'${folderId}' in parents and trashed = false`,
      'orderBy': 'name'
    });
    return response.result.files;
  } catch (err) {
    console.error("Error listing files", err);
    throw err;
  }
};

// Get content
export const getFileContent = async (fileId) => {
  try {
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    return response.body; 
  } catch (err) {
    console.error("Error getting file content", err);
    throw err;
  }
};
