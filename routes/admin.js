const express = require('express');
const axios = require('axios');
const db = require('../models/db');
const { adminMiddleware } = require('../middleware/admin');
const router = express.Router();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

router.get('/logs', adminMiddleware, async (req, res) => {
  const { type, limit } = req.query;
  const logs = await db.getLogs({ type, limit: parseInt(limit) || 200 });
  res.json(logs);
});

router.get('/users', adminMiddleware, async (req, res) => {
  const users = await db.getAllUsersAdmin();
  res.json(users);
});

router.get('/stats', adminMiddleware, async (req, res) => {
  const users = await db.getAllUsersAdmin();
  const logs  = await db.getLogs({ limit: 1000 });
  const now   = Math.floor(Date.now() / 1000);
  res.json({
    total_users:     users.length,
    users_today:     users.filter(u => u.created_at >= now - 86400).length,
    users_7d:        users.filter(u => u.created_at >= now - 7 * 86400).length,
    logins_today:    logs.filter(l => l.type === 'login'    && l.created_at >= now - 86400).length,
    registers_today: logs.filter(l => l.type === 'register' && l.created_at >= now - 86400).length,
    errors_today:    logs.filter(l => l.type === 'error'    && l.created_at >= now - 86400).length,
    recent_logs:     logs.slice(0, 50),
  });
});

router.delete('/users/:id', adminMiddleware, async (req, res) => {
  await db.updateUser(req.params.id, { disabled: true });
  await db.addLog({ type: 'action', username: req.adminUser.username, detail: `Admin a désactivé user ${req.params.id}` });
  res.json({ ok: true });
});

router.get('/bot-guilds', adminMiddleware, async (req, res) => {
  if (!BOT_TOKEN) return res.status(500).json({ error: 'Bot token manquant' });
  try {
    const r = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    res.json(r.data.map(g => ({ id: g.id, name: g.name, icon: g.icon })));
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération serveurs', detail: err.response?.data });
  }
});

router.post('/force-join', adminMiddleware, async (req, res) => {
  const { guild_id } = req.body;
  if (!guild_id) return res.status(400).json({ error: 'guild_id manquant' });
  if (!BOT_TOKEN) return res.status(500).json({ error: 'Bot token manquant' });

  const users = await db.getAllUsersAdmin();

  const discordUsers = users.filter(u => u.discord_id);

  let success = 0, failed = 0;
  for (const u of discordUsers) {
    try {

      await axios.put(
        `https://discord.com/api/v10/guilds/${guild_id}/members/${u.discord_id}`,
        { access_token: u.discord_access_token || '' },
        { headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' } }
      );
      success++;
    } catch (err) {

      if (err.response?.status === 204 || err.response?.status === 200) success++;
      else failed++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  await db.addLog({
    type: 'action',
    username: req.adminUser.username,
    detail: `Force-join serveur ${guild_id} : ${success} succès, ${failed} échecs`,
  });

  res.json({ ok: true, total: discordUsers.length, success, failed });
});

module.exports = router;
