// Simple demo auth endpoint
const express = require('express');
const app = express();

app.use(express.json());

// Demo user
const DEMO_USER = {
  email: 'demo@medguard360.local',
  password: 'demo123456789',
  id: 'demo-001',
  role: 'admin',
  name: 'Demo Admin'
};

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === DEMO_USER.email && password === DEMO_USER.password) {
    res.json({
      success: true,
      token: 'demo-jwt-token-' + Date.now(),
      user: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        role: DEMO_USER.role,
        name: DEMO_USER.name
      }
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid email or password' 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'demo-auth' });
});

const PORT = 3500;
app.listen(PORT, () => {
  console.log(`Demo auth service running on port ${PORT}`);
});
