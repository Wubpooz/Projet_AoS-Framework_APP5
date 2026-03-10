const fs = require('fs');
const path = require('path');

const collectionPath = 'postman/collections/New Collection';

// Remove old folders if they exist
const oldFolders = ['New Folder'];
oldFolders.forEach(folder => {
  const folderPath = path.join(collectionPath, folder);
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true });
  }
});

// Create folder structure
const folders = ['System', 'Auth', 'Users', 'Media', 'Collections'];
folders.forEach(folder => {
  const folderPath = path.join(collectionPath, folder);
  const resourcesPath = path.join(folderPath, '.resources');
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  if (!fs.existsSync(resourcesPath)) fs.mkdirSync(resourcesPath, { recursive: true });
});

// Helper to write request file
function writeRequest(folder, req) {
  const fileName = req.name.replace(/[/\\:*?"<>|]/g, '-') + '.request.yaml';
  fs.writeFileSync(path.join(collectionPath, folder, fileName), req.content);
  console.log(`Created: ${folder}/${fileName}`);
}

// System folder definition
const systemDef = `$kind: collection
name: System
description: System and health check endpoints
order: 1000
`;
fs.writeFileSync(path.join(collectionPath, 'System', '.resources', 'definition.yaml'), systemDef);

// System requests
const systemRequests = [
  {
    name: 'Root Info',
    content: `$kind: http-request
name: 'Root Info'
method: GET
url: '{{baseUrl}}/'
order: 1000
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
`
  },
  {
    name: 'Health Check',
    content: `$kind: http-request
name: 'Health Check'
method: GET
url: '{{baseUrl}}/health'
order: 2000
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
`
  },
  {
    name: 'OpenAPI Document',
    content: `$kind: http-request
name: 'OpenAPI Document'
method: GET
url: '{{baseUrl}}/openapi'
order: 3000
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
`
  },
  {
    name: 'Swagger UI',
    content: `$kind: http-request
name: 'Swagger UI'
method: GET
url: '{{baseUrl}}/docs'
order: 4000
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
`
  }
];

systemRequests.forEach(req => writeRequest('System', req));

// Auth folder definition
const authDef = `$kind: collection
name: Auth
description: Authentication endpoints - register, login, logout, password reset
order: 2000
`;
fs.writeFileSync(path.join(collectionPath, 'Auth', '.resources', 'definition.yaml'), authDef);

// Auth requests
const authRequests = [
  {
    name: '01 Register Owner',
    content: `$kind: http-request
name: '01 Register Owner'
method: POST
url: '{{baseUrl}}/api/auth/register'
order: 1000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "email": "{{ownerEmail}}",
      "password": "{{ownerPassword}}",
      "name": "Owner User"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '02 Register Invitee',
    content: `$kind: http-request
name: '02 Register Invitee'
method: POST
url: '{{baseUrl}}/api/auth/register'
order: 2000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "email": "{{inviteeEmail}}",
      "password": "{{inviteePassword}}",
      "name": "Invitee User"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '03 Login Owner',
    content: `$kind: http-request
name: '03 Login Owner'
method: POST
url: '{{baseUrl}}/api/auth/login'
order: 3000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "email": "{{ownerEmail}}",
      "password": "{{ownerPassword}}"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      // Save owner token from response body or header
      const jsonData = pm.response.json();
      if (jsonData.sessionToken) {
        pm.collectionVariables.set('ownerToken', jsonData.sessionToken);
        console.log('Saved ownerToken from response body');
      }
      
      // Also check set-auth-token header
      const authHeader = pm.response.headers.get('set-auth-token');
      if (authHeader) {
        pm.collectionVariables.set('ownerToken', authHeader);
        console.log('Saved ownerToken from header');
      }
      
      // Save owner user ID
      if (jsonData.user && jsonData.user.id) {
        pm.collectionVariables.set('ownerUserId', jsonData.user.id);
        pm.collectionVariables.set('publicUserId', jsonData.user.id);
        console.log('Saved ownerUserId:', jsonData.user.id);
      }
`
  },
  {
    name: '04 Login Invitee',
    content: `$kind: http-request
name: '04 Login Invitee'
method: POST
url: '{{baseUrl}}/api/auth/login'
order: 4000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "email": "{{inviteeEmail}}",
      "password": "{{inviteePassword}}"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      // Save invitee token from response body or header
      const jsonData = pm.response.json();
      if (jsonData.sessionToken) {
        pm.collectionVariables.set('inviteeToken', jsonData.sessionToken);
        console.log('Saved inviteeToken from response body');
      }
      
      // Also check set-auth-token header
      const authHeader = pm.response.headers.get('set-auth-token');
      if (authHeader) {
        pm.collectionVariables.set('inviteeToken', authHeader);
        console.log('Saved inviteeToken from header');
      }
      
      // Save invitee user ID
      if (jsonData.user && jsonData.user.id) {
        pm.collectionVariables.set('inviteeUserId', jsonData.user.id);
        console.log('Saved inviteeUserId:', jsonData.user.id);
      }
`
  },
  {
    name: '05 Get Session Info',
    content: `$kind: http-request
name: '05 Get Session Info'
method: GET
url: '{{baseUrl}}/api/auth/me'
order: 5000
auth:
  type: bearer
  credentials:
    - key: token
      value: '{{ownerToken}}'
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('User object exists', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.have.property('user');
      });
`
  },
  {
    name: '06 Forgot Password',
    content: `$kind: http-request
name: '06 Forgot Password'
method: POST
url: '{{baseUrl}}/api/auth/forgot-password'
order: 6000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "email": "{{ownerEmail}}"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '07 Reset Password',
    content: `$kind: http-request
name: '07 Reset Password'
method: POST
url: '{{baseUrl}}/api/auth/reset-password'
order: 7000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "token": "{{resetToken}}",
      "newPassword": "NewStrongPass123!"
    }
description: 'Note: This request requires a valid reset token. Skip if testing without email service.'
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      // This may fail without a valid reset token
      pm.test('Status code is 200 or 400', () => {
        pm.expect([200, 400]).to.include(pm.response.code);
      });
`
  },
  {
    name: '08 Logout',
    content: `$kind: http-request
name: '08 Logout'
method: POST
url: '{{baseUrl}}/api/auth/logout'
order: 8000
auth:
  type: bearer
  credentials:
    - key: token
      value: '{{ownerToken}}'
description: 'Note: Run this at the end of testing to clean up the session.'
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  }
];

authRequests.forEach(req => writeRequest('Auth', req));

// Users folder definition with auth
const usersDef = `$kind: collection
name: Users
description: User profile endpoints
order: 3000
auth:
  type: bearer
  credentials:
    - key: token
      value: '{{ownerToken}}'
`;
fs.writeFileSync(path.join(collectionPath, 'Users', '.resources', 'definition.yaml'), usersDef);

// Users requests
const usersRequests = [
  {
    name: '01 Get My Profile',
    content: `$kind: http-request
name: '01 Get My Profile'
method: GET
url: '{{baseUrl}}/api/users/me'
order: 1000
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('User object has required fields', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.have.property('user');
        pm.expect(jsonData.user).to.have.property('id');
        pm.expect(jsonData.user).to.have.property('email');
      });
`
  },
  {
    name: '02 Update My Profile',
    content: `$kind: http-request
name: '02 Update My Profile'
method: PATCH
url: '{{baseUrl}}/api/users/me'
order: 2000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "name": "Updated Owner Name",
      "username": "owneruser"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '03 Get Public User Profile',
    content: `$kind: http-request
name: '03 Get Public User Profile'
method: GET
url: '{{baseUrl}}/api/users/{{publicUserId}}'
order: 3000
auth:
  type: noauth
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '04 Get User Public Collections',
    content: `$kind: http-request
name: '04 Get User Public Collections'
method: GET
url: '{{baseUrl}}/api/users/{{publicUserId}}/collections'
order: 4000
auth:
  type: noauth
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('Collections array exists', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.have.property('collections');
        pm.expect(jsonData.collections).to.be.an('array');
      });
`
  }
];

usersRequests.forEach(req => writeRequest('Users', req));

// Media folder definition with auth
const mediaDef = `$kind: collection
name: Media
description: Media management endpoints
order: 4000
auth:
  type: bearer
  credentials:
    - key: token
      value: '{{ownerToken}}'
`;
fs.writeFileSync(path.join(collectionPath, 'Media', '.resources', 'definition.yaml'), mediaDef);

// Media requests
const mediaRequests = [
  {
    name: '01 Create Media',
    content: `$kind: http-request
name: '01 Create Media'
method: POST
url: '{{baseUrl}}/api/media'
order: 1000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "title": "Inception",
      "description": "A thief who steals corporate secrets through dream-sharing technology",
      "type": "FILM",
      "releaseDate": "2010-07-16T00:00:00.000Z",
      "directorAuthor": "Christopher Nolan",
      "tags": ["sci-fi", "thriller"],
      "platforms": ["Netflix", "Amazon Prime"],
      "url": "https://example.com/inception"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 201', () => {
        pm.expect(pm.response.code).to.equal(201);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      // Save media ID for later use
      const jsonData = pm.response.json();
      if (jsonData.id) {
        pm.collectionVariables.set('mediaId', jsonData.id);
        console.log('Saved mediaId:', jsonData.id);
      }
`
  },
  {
    name: '02 List Media',
    content: `$kind: http-request
name: '02 List Media'
method: GET
url: '{{baseUrl}}/api/media'
order: 2000
queryParams:
  - key: page
    value: '1'
  - key: pageSize
    value: '20'
auth:
  type: noauth
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('Response has pagination fields', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.have.property('data');
        pm.expect(jsonData).to.have.property('page');
        pm.expect(jsonData).to.have.property('pageSize');
        pm.expect(jsonData).to.have.property('total');
      });
`
  },
  {
    name: '03 Get Media By Id',
    content: `$kind: http-request
name: '03 Get Media By Id'
method: GET
url: '{{baseUrl}}/api/media/{{mediaId}}'
order: 3000
auth:
  type: noauth
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('Media has required fields', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.have.property('id');
        pm.expect(jsonData).to.have.property('title');
        pm.expect(jsonData).to.have.property('type');
      });
`
  },
  {
    name: '04 Update Media',
    content: `$kind: http-request
name: '04 Update Media'
method: PATCH
url: '{{baseUrl}}/api/media/{{mediaId}}'
order: 4000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "title": "Inception (Updated)",
      "description": "Updated description for the movie"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '05 Delete Media',
    content: `$kind: http-request
name: '05 Delete Media'
method: DELETE
url: '{{baseUrl}}/api/media/{{mediaId}}'
order: 5000
description: 'Note: Run this at the end to clean up. Creates a new media first if needed.'
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
`
  }
];

mediaRequests.forEach(req => writeRequest('Media', req));

// Collections folder definition with auth
const collectionsDef = `$kind: collection
name: Collections
description: Collection management endpoints - CRUD, media, members, invitations
order: 5000
auth:
  type: bearer
  credentials:
    - key: token
      value: '{{ownerToken}}'
`;
fs.writeFileSync(path.join(collectionPath, 'Collections', '.resources', 'definition.yaml'), collectionsDef);

// Collections requests
const collectionsRequests = [
  {
    name: '01 Create Collection',
    content: `$kind: http-request
name: '01 Create Collection'
method: POST
url: '{{baseUrl}}/api/collections'
order: 1000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "name": "My Favorites",
      "description": "A collection of my favorite movies",
      "tags": ["favorites", "movies"],
      "visibility": "PUBLIC"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 201', () => {
        pm.expect(pm.response.code).to.equal(201);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      // Save collection ID for later use
      const jsonData = pm.response.json();
      if (jsonData.id) {
        pm.collectionVariables.set('collectionId', jsonData.id);
        console.log('Saved collectionId:', jsonData.id);
      }
`
  },
  {
    name: '02 List Collections',
    content: `$kind: http-request
name: '02 List Collections'
method: GET
url: '{{baseUrl}}/api/collections'
order: 2000
queryParams:
  - key: page
    value: '1'
  - key: pageSize
    value: '20'
auth:
  type: noauth
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('Response has pagination fields', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.have.property('data');
        pm.expect(jsonData).to.have.property('page');
        pm.expect(jsonData).to.have.property('total');
      });
`
  },
  {
    name: '03 Get Collection By Id',
    content: `$kind: http-request
name: '03 Get Collection By Id'
method: GET
url: '{{baseUrl}}/api/collections/{{collectionId}}'
order: 3000
auth:
  type: noauth
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('Collection has required fields', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.have.property('id');
        pm.expect(jsonData).to.have.property('name');
        pm.expect(jsonData).to.have.property('visibility');
      });
`
  },
  {
    name: '04 Update Collection',
    content: `$kind: http-request
name: '04 Update Collection'
method: PATCH
url: '{{baseUrl}}/api/collections/{{collectionId}}'
order: 4000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "name": "My Updated Favorites",
      "description": "Updated collection description"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '05 Create Media For Collection',
    content: `$kind: http-request
name: '05 Create Media For Collection'
method: POST
url: '{{baseUrl}}/api/media'
order: 5000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "title": "The Dark Knight",
      "description": "Batman faces the Joker",
      "type": "FILM",
      "tags": ["action", "superhero"]
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 201', () => {
        pm.expect(pm.response.code).to.equal(201);
      });
      
      // Save media ID for adding to collection
      const jsonData = pm.response.json();
      if (jsonData.id) {
        pm.collectionVariables.set('mediaId', jsonData.id);
        console.log('Saved mediaId for collection:', jsonData.id);
      }
`
  },
  {
    name: '06 Add Media To Collection',
    content: `$kind: http-request
name: '06 Add Media To Collection'
method: POST
url: '{{baseUrl}}/api/collections/{{collectionId}}/media'
order: 6000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "mediaId": "{{mediaId}}",
      "position": 0
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 201', () => {
        pm.expect(pm.response.code).to.equal(201);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      // Save collection media ID for later use
      const jsonData = pm.response.json();
      if (jsonData.id) {
        pm.collectionVariables.set('collectionMediaId', jsonData.id);
        console.log('Saved collectionMediaId:', jsonData.id);
      }
`
  },
  {
    name: '07 List Collection Media',
    content: `$kind: http-request
name: '07 List Collection Media'
method: GET
url: '{{baseUrl}}/api/collections/{{collectionId}}/media'
order: 7000
auth:
  type: noauth
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('Response is an array', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.be.an('array');
      });
`
  },
  {
    name: '08 Update Collection Media Position',
    content: `$kind: http-request
name: '08 Update Collection Media Position'
method: PATCH
url: '{{baseUrl}}/api/collections/{{collectionId}}/media/{{collectionMediaId}}'
order: 8000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "position": 5
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '09 Invite Member To Collection',
    content: `$kind: http-request
name: '09 Invite Member To Collection'
method: POST
url: '{{baseUrl}}/api/collections/{{collectionId}}/members'
order: 9000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "userId": "{{inviteeUserId}}",
      "role": "COLLABORATOR"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 201', () => {
        pm.expect(pm.response.code).to.equal(201);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      // Save member ID for later use
      const jsonData = pm.response.json();
      if (jsonData.id) {
        pm.collectionVariables.set('memberId', jsonData.id);
        console.log('Saved memberId:', jsonData.id);
      }
`
  },
  {
    name: '10 List Collection Members',
    content: `$kind: http-request
name: '10 List Collection Members'
method: GET
url: '{{baseUrl}}/api/collections/{{collectionId}}/members'
order: 10000
auth:
  type: noauth
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('Response is an array', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.be.an('array');
      });
`
  },
  {
    name: '11 Get Pending Invitations (Invitee)',
    content: `$kind: http-request
name: '11 Get Pending Invitations (Invitee)'
method: GET
url: '{{baseUrl}}/api/collections/invitations'
order: 11000
auth:
  type: bearer
  credentials:
    - key: token
      value: '{{inviteeToken}}'
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
      
      pm.test('Response is an array', () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.be.an('array');
      });
`
  },
  {
    name: '12 Accept Invitation (Invitee)',
    content: `$kind: http-request
name: '12 Accept Invitation (Invitee)'
method: POST
url: '{{baseUrl}}/api/collections/{{collectionId}}/invitations/respond'
order: 12000
auth:
  type: bearer
  credentials:
    - key: token
      value: '{{inviteeToken}}'
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "accept": true
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '13 Update Member Role',
    content: `$kind: http-request
name: '13 Update Member Role'
method: PATCH
url: '{{baseUrl}}/api/collections/{{collectionId}}/members/{{memberId}}'
order: 13000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "role": "READER"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
      
      pm.test('Response is JSON', () => {
        pm.response.to.have.header('Content-Type', /application\\/json/);
      });
`
  },
  {
    name: '14 Remove Member From Collection',
    content: `$kind: http-request
name: '14 Remove Member From Collection'
method: DELETE
url: '{{baseUrl}}/api/collections/{{collectionId}}/members/{{memberId}}'
order: 14000
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
`
  },
  {
    name: '15 Remove Media From Collection',
    content: `$kind: http-request
name: '15 Remove Media From Collection'
method: DELETE
url: '{{baseUrl}}/api/collections/{{collectionId}}/media/{{collectionMediaId}}'
order: 15000
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
`
  },
  {
    name: '16 Delete Collection',
    content: `$kind: http-request
name: '16 Delete Collection'
method: DELETE
url: '{{baseUrl}}/api/collections/{{collectionId}}'
order: 16000
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      pm.test('Status code is 200', () => {
        pm.expect(pm.response.code).to.equal(200);
      });
`
  }
];

collectionsRequests.forEach(req => writeRequest('Collections', req));

console.log('\n=== Collection creation complete ===');
console.log('Folders created:', folders);

// List all created files
folders.forEach(folder => {
  const folderPath = path.join(collectionPath, folder);
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.yaml'));
  console.log(`\n${folder}/ (${files.length} requests):`);
  files.forEach(f => console.log(`  - ${f}`));
});
