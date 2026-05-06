import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Resolved api/.env next to package.json */
const ENV_FILE_PATH = path.join(__dirname, '..', '.env');
dotenv.config({ path: ENV_FILE_PATH });
import {
  clearAlerts,
  deleteMeeting,
  deleteStaff,
  deleteUnit,
  findStaffByPincode,
  getDb,
  getReadingsForAllUnits,
  getReadingsForUnit,
  getReadingsForUnitInTimeRange,
  getSettings,
  getStaffById,
  insertAlert,
  insertFeedback,
  insertMeeting,
  insertStaff,
  insertUnit,
  listAlerts,
  listFeedbackForUnit,
  listMeetings,
  listStaff,
  listUnits,
  listUnitsForLiveIngest,
  migrateFromBrowserPayload,
  NoiseReadingRow,
  setSettings,
  updateAlertRead,
  updateMeeting,
  updateStaff,
  updateUnit,
} from './db.js';
import { getMqttIngestState, startMqttIngest } from './mqtt-ingest.js';

declare module 'express-session' {
  interface SessionData {
    staffId?: string;
  }
}

const app = express();
const DEFAULT_LIMIT = 100;

// TLS often terminates at Coolify/nginx; Node sees HTTP. Trust X-Forwarded-Proto so
// req.secure is true and express-session can send Secure + SameSite=None cookies.
if (process.env.NODE_ENV === 'production') {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  app.set('trust proxy', Number.isFinite(hops) && hops > 0 ? hops : 1);
}

function parseCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw === '*') return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

app.use(
  cors({
    origin: parseCorsOrigins(),
    credentials: true,
  }),
);
app.use(express.json());

const sessionSecret = process.env.SESSION_SECRET || 'quietcare-dev-change-me';
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session.staffId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session.staffId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const s = getStaffById(req.session.staffId);
  if (!s?.isAdmin) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  next();
}

function rowToDto(r: NoiseReadingRow) {
  return {
    id: r.id,
    unitId: r.unit_id,
    timestamp: r.timestamp_ms,
    decibels: r.decibels,
  };
}

app.get('/api/health', (_req, res) => {
  const mqttConfigured = Boolean(process.env.MQTT_URL?.trim());
  const mq = getMqttIngestState();
  res.json({
    ok: true,
    mqtt: {
      configured: mqttConfigured,
      connected: mq.connected,
      lastMessageAt: mq.lastMessageAt,
    },
  });
});

/** Minimal unit info for anonymous patient feedback (QR / public link). */
app.get('/api/public/units/:id', (req, res) => {
  try {
    const row = getDb()
      .prepare('SELECT id, name FROM units WHERE id = ?')
      .get(req.params.id) as { id: string; name: string } | undefined;
    if (!row) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const pincode = (req.body as { pincode?: string })?.pincode;
    if (typeof pincode !== 'string') {
      res.status(400).json({ error: 'pincode required' });
      return;
    }
    const staff = findStaffByPincode(pincode.trim());
    if (!staff) {
      res.status(401).json({ error: 'invalid_pincode' });
      return;
    }
    req.session.staffId = staff.id;
    res.json({ user: staff });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'login_failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.staffId) {
    res.json({ user: null });
    return;
  }
  const staff = getStaffById(req.session.staffId);
  res.json({ user: staff });
});

app.get('/api/settings', requireAuth, (_req, res) => {
  res.json(getSettings());
});

app.put('/api/settings', requireAuth, (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'invalid body' });
      return;
    }
    setSettings(body);
    res.json(getSettings());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/units', requireAuth, (_req, res) => {
  res.json(listUnits());
});

app.post('/api/units', requireAuth, (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const id = typeof b.id === 'string' ? b.id : randomUUID();
    insertUnit({
      id,
      name: String(b.name),
      type: String(b.type),
      location: String(b.location),
      floor: String(b.floor),
      department: String(b.department),
      targetDecibel: Number(b.targetDecibel),
      deviceName: String(b.deviceName),
      deviceId: String(b.deviceId),
      createdAt: Number(b.createdAt) || Date.now(),
      readingSource: b.readingSource === 'live' ? 'live' : 'demo',
    });
    res.status(201).json(listUnits().find((u) => u.id === id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.patch('/api/units/:id', requireAuth, (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    updateUnit(req.params.id, {
      name: String(b.name),
      type: String(b.type),
      location: String(b.location),
      floor: String(b.floor),
      department: String(b.department),
      targetDecibel: Number(b.targetDecibel),
      deviceName: String(b.deviceName),
      deviceId: String(b.deviceId),
      readingSource: b.readingSource === 'live' ? 'live' : 'demo',
    });
    res.json(listUnits().find((u) => u.id === req.params.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.delete('/api/units/:id', requireAuth, (req, res) => {
  try {
    deleteUnit(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/staff', requireAuth, (_req, res) => {
  res.json(listStaff());
});

app.post('/api/staff', requireAuth, (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const id = typeof b.id === 'string' ? b.id : randomUUID();
    insertStaff({
      id,
      name: String(b.name),
      role: String(b.role),
      unitId: String(b.unitId),
      status: String(b.status) as 'active' | 'on-break' | 'off-duty',
      email: b.email ? String(b.email) : undefined,
      pincode: String(b.pincode),
      isAdmin: Boolean(b.isAdmin),
      notificationPreferences: b.notificationPreferences as object | undefined,
    });
    res.status(201).json(listStaff().find((s) => s.id === id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.patch('/api/staff/:id', requireAuth, (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    updateStaff(req.params.id, {
      name: String(b.name),
      role: String(b.role),
      unitId: String(b.unitId),
      status: String(b.status),
      email: b.email ? String(b.email) : undefined,
      pincode: String(b.pincode),
      isAdmin: Boolean(b.isAdmin),
      notificationPreferences: b.notificationPreferences as object | undefined,
    });
    res.json(listStaff().find((s) => s.id === req.params.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.delete('/api/staff/:id', requireAuth, (req, res) => {
  try {
    deleteStaff(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/meetings', requireAuth, (_req, res) => {
  res.json(listMeetings());
});

app.post('/api/meetings', requireAuth, (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const id = typeof b.id === 'string' ? b.id : randomUUID();
    insertMeeting({
      id,
      timestamp: Number(b.timestamp) || Date.now(),
      title: String(b.title),
      attendees: (b.attendees as string[]) ?? [],
      notes: String(b.notes ?? ''),
      decisions: (b.decisions as string[]) ?? [],
      nextSteps: (b.nextSteps as string[]) ?? [],
    });
    res.status(201).json((listMeetings() as object[]).find((m) => (m as { id: string }).id === id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.patch('/api/meetings/:id', requireAuth, (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    updateMeeting(req.params.id, {
      title: String(b.title),
      attendees: (b.attendees as string[]) ?? [],
      notes: String(b.notes ?? ''),
      decisions: (b.decisions as string[]) ?? [],
      nextSteps: (b.nextSteps as string[]) ?? [],
      timestamp: Number(b.timestamp),
    });
    res.json((listMeetings() as object[]).find((m) => (m as { id: string }).id === req.params.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.delete('/api/meetings/:id', requireAuth, (req, res) => {
  try {
    deleteMeeting(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/alerts', requireAuth, (_req, res) => {
  res.json(listAlerts());
});

app.post('/api/alerts', requireAuth, (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const id = typeof b.id === 'string' ? b.id : randomUUID();
    insertAlert({
      id,
      unitId: String(b.unitId),
      timestamp: Number(b.timestamp) || Date.now(),
      type: String(b.type),
      message: String(b.message),
      severity: String(b.severity),
      isRead: Boolean(b.isRead),
    });
    res.status(201).json((listAlerts() as object[]).find((a) => (a as { id: string }).id === id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.patch('/api/alerts/:id', requireAuth, (req, res) => {
  try {
    const isRead = Boolean((req.body as { isRead?: boolean }).isRead);
    updateAlertRead(req.params.id, isRead);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.delete('/api/alerts', requireAuth, (_req, res) => {
  try {
    clearAlerts();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/feedback', requireAuth, (req, res) => {
  const unitId = typeof req.query.unitId === 'string' ? req.query.unitId : '';
  if (!unitId) {
    res.status(400).json({ error: 'unitId required' });
    return;
  }
  res.json(listFeedbackForUnit(unitId));
});

app.post('/api/feedback', (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const unitId = String(b.unitId);
    if (!unitId) {
      res.status(400).json({ error: 'unitId required' });
      return;
    }
    const id = randomUUID();
    const ts = Date.now();
    insertFeedback({
      id,
      unitId,
      timestamp: ts,
      score: Number(b.score),
      comment: String(b.comment ?? ''),
    });
    res.status(201).json({
      id,
      unitId,
      timestamp: ts,
      score: Number(b.score),
      comment: String(b.comment ?? ''),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed' });
  }
});

app.post('/api/migrate', requireAdmin, (req, res) => {
  try {
    migrateFromBrowserPayload(req.body as Parameters<typeof migrateFromBrowserPayload>[0]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'migrate_failed' });
  }
});

app.get('/api/readings', requireAuth, (req, res) => {
  try {
    getDb();
    const unitId = typeof req.query.unitId === 'string' ? req.query.unitId : undefined;
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 10000);
    const fromQ = req.query.from;
    const toQ = req.query.to;
    const fromMs = typeof fromQ === 'string' && fromQ !== '' ? Number(fromQ) : undefined;
    const toMs = typeof toQ === 'string' && toQ !== '' ? Number(toQ) : undefined;
    if (
      unitId &&
      fromMs != null &&
      Number.isFinite(fromMs) &&
      toMs != null &&
      Number.isFinite(toMs)
    ) {
      const rows = getReadingsForUnitInTimeRange(unitId, fromMs, toMs, limit).map(rowToDto);
      res.json({ byUnitId: { [unitId]: rows } });
      return;
    }
    if (unitId) {
      const rows = getReadingsForUnit(unitId, limit).map(rowToDto);
      res.json({ byUnitId: { [unitId]: rows } });
      return;
    }
    const raw = getReadingsForAllUnits(Math.min(limit, 500));
    const byUnitId: Record<string, ReturnType<typeof rowToDto>[]> = {};
    for (const [uid, rows] of Object.entries(raw)) {
      byUnitId[uid] = rows.map(rowToDto);
    }
    res.json({ byUnitId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'readings_failed' });
  }
});

const apiPort = Number(process.env.API_PORT || process.env.PORT) || 3001;

app.listen(apiPort, () => {
  getDb();
  console.log(`[api] listening on ${apiPort}`);

  const mqttConfigured = Boolean(process.env.MQTT_URL?.trim());
  if (mqttConfigured) {
    startMqttIngest();
  } else {
    console.warn(
      `[api] MQTT_URL not set — live units will not receive readings. Set MQTT broker URL in ${ENV_FILE_PATH}`,
    );
  }

  const liveTargets = listUnitsForLiveIngest();
  if (liveTargets.length > 0) {
    console.log(
      `[api] ${liveTargets.length} live unit(s) (ids: ${liveTargets.map((p) => p.id).join(', ')})`,
    );
    if (!mqttConfigured) {
      console.warn(
        '[api] Live units exist but MQTT is off; /api/readings will stay empty for those until MQTT_URL is set.',
      );
    }
  }
});
