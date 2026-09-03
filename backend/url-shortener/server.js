const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const links = new Map();

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'url-shortener' }));
app.post('/api/shorten', (req, res) => {
  try {
    const url = new URL(req.body.url);
    if (!/^https?:$/.test(url.protocol)) throw new Error();
    let code = crypto.randomBytes(4).toString('hex');
    while (links.has(code)) code = crypto.randomBytes(4).toString('hex');
    links.set(code, url.toString());
    res.status(201).json({ code, url: url.toString(), shortPath: `/r/${code}` });
  } catch {
    res.status(400).json({ error: 'Please provide a valid http or https URL' });
  }
});
app.get('/r/:code', (req, res) => {
  const url = links.get(req.params.code);
  if (!url) return res.status(404).json({ error: 'Short link not found' });
  res.redirect(url);
});

app.listen(process.env.PORT || 3001, () => console.log('URL Shortener running'));
