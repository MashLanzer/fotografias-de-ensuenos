const express = require('express');
const path = require('path');
const fs = require('fs');

// Placeholder server — Supabase/proxy removed. Use Firebase Storage.
const app = express();

// Serve static files from ../public (if present) for local dev convenience
const publicPath = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  console.log('Serving static files from', publicPath);
}

app.get('/api/health', (req, res) => res.json({ ok: true, note: 'Supabase proxy removed; use Firebase Storage' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Placeholder server listening on http://localhost:${port}`));
