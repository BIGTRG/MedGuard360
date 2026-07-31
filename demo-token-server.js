const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'uZ+rM4Jcxsm9zK9UWG9hL6QoI2hkB26qetQxAjSrL2w6Ab2y';

const DEMO_USERS = {
  'demo.provider@medguard360.local': {
    role: 'individual_provider',
    stateCode: 'NC',
    npi: '1245678901'
  },
  'demo.mco@medguard360.local': {
    role: 'mco_admin',
    stateCode: 'NC'
  },
  'demo.state@medguard360.local': {
    role: 'state_medicaid_agency',
    stateCode: 'NC'
  },
  'demo.fraud@medguard360.local': {
    role: 'fraud_investigator',
    stateCode: 'NC'
  },
  'demo.pa@medguard360.local': {
    role: 'prior_auth_specialist',
    stateCode: 'NC'
  },
  'demo.patient@medguard360.local': {
    role: 'patient',
    stateCode: 'NC'
  }
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/' && req.method === 'GET') {
    // Return demo credentials page
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>MedGuard360 Demo Login</title>
  <style>
    body { font-family: Arial; max-width: 800px; margin: 50px auto; }
    .user { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
    button { background: #0066cc; color: white; padding: 10px 20px; border: none; border-radius: 3px; cursor: pointer; }
    button:hover { background: #0052a3; }
    code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>🚀 MedGuard360 - Demo Login</h1>
  <p>Click any user below to get a demo JWT token and access the system:</p>
  
  <div id="users"></div>
  
  <h3>System Links:</h3>
  <ul>
    <li><a href="http://178.105.21.227:8080" target="_blank">Dashboard (System Overview)</a></li>
    <li><a href="http://178.105.21.227:3000" target="_blank">Web Portal</a></li>
  </ul>

  <script>
    const users = ${JSON.stringify(DEMO_USERS)};
    const container = document.getElementById('users');
    
    Object.keys(users).forEach(email => {
      const role = users[email].role;
      const div = document.createElement('div');
      div.className = 'user';
      div.innerHTML = \`
        <strong>\${email}</strong> (<em>\${role}</em>)<br>
        <button onclick="getToken('\${email}')">Get Token</button>
        <code id="token-\${email}" style="display: none; margin-top: 10px; display: block; word-break: break-all;"></code>
      \`;
      container.appendChild(div);
    });
    
    function getToken(email) {
      fetch('http://178.105.21.227:7777/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      .then(r => r.json())
      .then(data => {
        const tokenEl = document.getElementById('token-' + email);
        tokenEl.textContent = 'Token: ' + data.token;
        tokenEl.style.display = 'block';
        
        // Also copy to clipboard
        navigator.clipboard.writeText(data.token);
        alert('Token copied to clipboard!\n\nUse in API calls:\nAuthorization: Bearer ' + data.token);
      })
      .catch(err => alert('Error: ' + err.message));
    }
  </script>
</body>
</html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (req.url === '/token' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { email } = JSON.parse(body);
        const user = DEMO_USERS[email];
        
        if (!user) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid email' }));
          return;
        }

        const token = jwt.sign(
          {
            sub: 'demo-' + email,
            email,
            role: user.role,
            stateCode: user.stateCode,
            npi: user.npi,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
          },
          JWT_SECRET,
          { algorithm: 'HS256', issuer: 'medguard360', audience: 'medguard360-platform' }
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token, expiresIn: 3600 }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(7777, '0.0.0.0', () => {
  console.log('Demo Token Server running on port 7777');
});
