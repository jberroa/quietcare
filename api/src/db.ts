import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DEFAULT_SETTINGS, SEED_STAFF, SEED_UNITS } from './seed.js';

export interface NoiseReadingRow {
  id: string;
  unit_id: string;
  timestamp_ms: number;
  decibels: number;
  raw_status_json: string | null;
  /** Unix seconds from Tuya device payload; used to skip duplicate snapshots. */
  tuya_dedup_time?: number | null;
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath =
    process.env.DATABASE_PATH ||
    path.join(process.cwd(), 'data', 'quietcare.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  migrateUnitsAndReadings(db);
  migrateLegacyMappings(db);
  seedIfEmpty(db);
  return db;
}

function migrateUnitsAndReadings(database: Database.Database): void {
  const unitCols = database.prepare('PRAGMA table_info(units)').all() as Array<{ name: string }>;
  if (!unitCols.some((c) => c.name === 'reading_source')) {
    database.exec(`ALTER TABLE units ADD COLUMN reading_source TEXT NOT NULL DEFAULT 'demo'`);
  }
  const noiseCols = database
    .prepare('PRAGMA table_info(noise_readings)')
    .all() as Array<{ name: string }>;
  if (!noiseCols.some((c) => c.name === 'tuya_dedup_time')) {
    database.exec(`ALTER TABLE noise_readings ADD COLUMN tuya_dedup_time INTEGER`);
  }
  database.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_noise_unit_tuya_dedup
     ON noise_readings(unit_id, tuya_dedup_time) WHERE tuya_dedup_time IS NOT NULL`,
  );
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      floor TEXT NOT NULL,
      department TEXT NOT NULL,
      target_decibel INTEGER NOT NULL,
      device_name TEXT NOT NULL,
      tuya_device_id TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      reading_source TEXT NOT NULL DEFAULT 'demo'
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      status TEXT NOT NULL,
      email TEXT,
      pincode TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      notification_preferences_json TEXT
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY NOT NULL,
      timestamp INTEGER NOT NULL,
      title TEXT NOT NULL,
      attendees_json TEXT NOT NULL,
      notes TEXT NOT NULL,
      decisions_json TEXT NOT NULL,
      next_steps_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      unit_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      settings_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS noise_readings (
      id TEXT PRIMARY KEY NOT NULL,
      unit_id TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      decibels REAL NOT NULL,
      raw_status_json TEXT,
      tuya_dedup_time INTEGER
    );

    CREATE TABLE IF NOT EXISTS patient_feedback (
      id TEXT PRIMARY KEY NOT NULL,
      unit_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      score INTEGER NOT NULL,
      comment TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_noise_readings_unit_time
      ON noise_readings (unit_id, timestamp_ms DESC);
    CREATE INDEX IF NOT EXISTS idx_feedback_unit_time
      ON patient_feedback (unit_id, timestamp DESC);
  `);
}

function migrateLegacyMappings(database: Database.Database): void {
  const row = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='unit_mappings'",
    )
    .get() as { name: string } | undefined;
  if (!row) return;

  const mappings = database
    .prepare('SELECT unit_id, tuya_device_id FROM unit_mappings')
    .all() as Array<{ unit_id: string; tuya_device_id: string }>;

  for (const m of mappings) {
    const exists = database.prepare('SELECT 1 FROM units WHERE id = ?').get(m.unit_id);
    if (!exists) {
      database
        .prepare(
          `INSERT INTO units (id, name, type, location, floor, department, target_decibel, device_name, tuya_device_id, created_at, reading_source)
           VALUES (?, 'Imported unit', 'Unknown', '', '', '', 45, '', ?, ?, 'live')`,
        )
        .run(m.unit_id, m.tuya_device_id, Date.now());
    } else {
      database
        .prepare('UPDATE units SET tuya_device_id = ? WHERE id = ?')
        .run(m.tuya_device_id, m.unit_id);
    }
  }
  database.exec('DROP TABLE IF EXISTS unit_mappings');
}

function seedIfEmpty(database: Database.Database): void {
  const n = database.prepare('SELECT COUNT(*) as c FROM staff').get() as { c: number };
  if (n.c > 0) return;

  const insUnit = database.prepare(
    `INSERT INTO units (id, name, type, location, floor, department, target_decibel, device_name, tuya_device_id, created_at, reading_source)
     VALUES (@id, @name, @type, @location, @floor, @department, @targetDecibel, @deviceName, @deviceId, @createdAt, @readingSource)`,
  );
  for (const u of SEED_UNITS) {
    insUnit.run({
      id: u.id,
      name: u.name,
      type: u.type,
      location: u.location,
      floor: u.floor,
      department: u.department,
      targetDecibel: u.targetDecibel,
      deviceName: u.deviceName,
      deviceId: u.deviceId,
      createdAt: u.createdAt,
      readingSource: u.readingSource,
    });
  }

  const insStaff = database.prepare(
    `INSERT INTO staff (id, name, role, unit_id, status, email, pincode, is_admin, notification_preferences_json)
     VALUES (@id, @name, @role, @unitId, @status, @email, @pincode, @isAdmin, @prefs)`,
  );
  for (const s of SEED_STAFF) {
    insStaff.run({
      id: s.id,
      name: s.name,
      role: s.role,
      unitId: s.unitId,
      status: s.status,
      email: s.email ?? null,
      pincode: s.pincode,
      isAdmin: s.isAdmin ? 1 : 0,
      prefs: JSON.stringify(s.notificationPreferences ?? {}),
    });
  }

  database
    .prepare('INSERT OR REPLACE INTO app_settings (id, settings_json) VALUES (1, ?)')
    .run(JSON.stringify(DEFAULT_SETTINGS));
}

// --- Units ---

export function listUnits(): Array<Record<string, unknown>> {
  const rows = getDb()
    .prepare(
      `SELECT id, name, type, location, floor, department, target_decibel as targetDecibel,
              device_name as deviceName, tuya_device_id as deviceId, created_at as createdAt,
              reading_source as readingSource
       FROM units ORDER BY name`,
    )
    .all();
  return rows as Array<Record<string, unknown>>;
}

export function listUnitsForPoll(): Array<{ id: string; tuya_device_id: string }> {
  return getDb()
    .prepare(
      `SELECT id, trim(tuya_device_id) as tuya_device_id
       FROM units
       WHERE trim(tuya_device_id) != '' AND reading_source = 'live'`,
    )
    .all() as Array<{ id: string; tuya_device_id: string }>;
}

export function insertUnit(row: {
  id: string;
  name: string;
  type: string;
  location: string;
  floor: string;
  department: string;
  targetDecibel: number;
  deviceName: string;
  deviceId: string;
  createdAt: number;
  readingSource?: 'demo' | 'live';
}): void {
  const readingSource = row.readingSource === 'live' ? 'live' : 'demo';
  getDb()
    .prepare(
      `INSERT INTO units (id, name, type, location, floor, department, target_decibel, device_name, tuya_device_id, created_at, reading_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.name,
      row.type,
      row.location,
      row.floor,
      row.department,
      row.targetDecibel,
      row.deviceName,
      row.deviceId,
      row.createdAt,
      readingSource,
    );
}

export function updateUnit(
  id: string,
  row: {
    name: string;
    type: string;
    location: string;
    floor: string;
    department: string;
    targetDecibel: number;
    deviceName: string;
    deviceId: string;
    readingSource?: 'demo' | 'live';
  },
): void {
  const readingSource = row.readingSource === 'live' ? 'live' : 'demo';
  getDb()
    .prepare(
      `UPDATE units SET name=?, type=?, location=?, floor=?, department=?, target_decibel=?, device_name=?, tuya_device_id=?, reading_source=?
       WHERE id=?`,
    )
    .run(
      row.name,
      row.type,
      row.location,
      row.floor,
      row.department,
      row.targetDecibel,
      row.deviceName,
      row.deviceId,
      readingSource,
      id,
    );
}

export function deleteUnit(id: string): void {
  getDb().prepare('DELETE FROM units WHERE id = ?').run(id);
}

// --- Staff ---

export interface StaffDto {
  id: string;
  name: string;
  role: string;
  unitId: string;
  status: string;
  email?: string;
  pincode: string;
  isAdmin: boolean;
  notificationPreferences?: object;
}

function staffRowToDto(r: Record<string, unknown>): StaffDto {
  return {
    id: String(r.id),
    name: String(r.name),
    role: String(r.role),
    unitId: String(r.unit_id),
    status: String(r.status),
    email: r.email != null ? String(r.email) : undefined,
    pincode: String(r.pincode),
    isAdmin: Boolean(r.is_admin),
    notificationPreferences: r.notification_preferences_json
      ? (JSON.parse(String(r.notification_preferences_json)) as object)
      : undefined,
  };
}

export function listStaff(): StaffDto[] {
  const rows = getDb()
    .prepare(
      'SELECT id, name, role, unit_id, status, email, pincode, is_admin, notification_preferences_json FROM staff ORDER BY name',
    )
    .all() as Record<string, unknown>[];
  return rows.map(staffRowToDto);
}

export function findStaffByPincode(pincode: string): StaffDto | null {
  const r = getDb()
    .prepare(
      'SELECT id, name, role, unit_id, status, email, pincode, is_admin, notification_preferences_json FROM staff WHERE pincode = ?',
    )
    .get(pincode) as Record<string, unknown> | undefined;
  return r ? staffRowToDto(r) : null;
}

export function getStaffById(id: string): StaffDto | null {
  const r = getDb()
    .prepare(
      'SELECT id, name, role, unit_id, status, email, pincode, is_admin, notification_preferences_json FROM staff WHERE id = ?',
    )
    .get(id) as Record<string, unknown> | undefined;
  return r ? staffRowToDto(r) : null;
}

export function insertStaff(row: {
  id: string;
  name: string;
  role: string;
  unitId: string;
  status: string;
  email?: string;
  pincode: string;
  isAdmin?: boolean;
  notificationPreferences?: object;
}): void {
  getDb()
    .prepare(
      `INSERT INTO staff (id, name, role, unit_id, status, email, pincode, is_admin, notification_preferences_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.name,
      row.role,
      row.unitId,
      row.status,
      row.email ?? null,
      row.pincode,
      row.isAdmin ? 1 : 0,
      JSON.stringify(row.notificationPreferences ?? {}),
    );
}

export function updateStaff(
  id: string,
  row: {
    name: string;
    role: string;
    unitId: string;
    status: string;
    email?: string;
    pincode: string;
    isAdmin?: boolean;
    notificationPreferences?: object;
  },
): void {
  getDb()
    .prepare(
      `UPDATE staff SET name=?, role=?, unit_id=?, status=?, email=?, pincode=?, is_admin=?, notification_preferences_json=?
       WHERE id=?`,
    )
    .run(
      row.name,
      row.role,
      row.unitId,
      row.status,
      row.email ?? null,
      row.pincode,
      row.isAdmin ? 1 : 0,
      JSON.stringify(row.notificationPreferences ?? {}),
      id,
    );
}

export function deleteStaff(id: string): void {
  getDb().prepare('DELETE FROM staff WHERE id = ?').run(id);
}

// --- Meetings ---

export function listMeetings(): unknown[] {
  const rows = getDb()
    .prepare(
      'SELECT id, timestamp, title, attendees_json, notes, decisions_json, next_steps_json FROM meetings ORDER BY timestamp DESC',
    )
    .all() as Array<Record<string, string | number>>;
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    title: r.title,
    attendees: JSON.parse(r.attendees_json as string),
    notes: r.notes,
    decisions: JSON.parse(r.decisions_json as string),
    nextSteps: JSON.parse(r.next_steps_json as string),
  }));
}

export function insertMeeting(row: {
  id: string;
  timestamp: number;
  title: string;
  attendees: string[];
  notes: string;
  decisions: string[];
  nextSteps: string[];
}): void {
  getDb()
    .prepare(
      `INSERT INTO meetings (id, timestamp, title, attendees_json, notes, decisions_json, next_steps_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.timestamp,
      row.title,
      JSON.stringify(row.attendees),
      row.notes,
      JSON.stringify(row.decisions),
      JSON.stringify(row.nextSteps),
    );
}

export function updateMeeting(
  id: string,
  row: {
    title: string;
    attendees: string[];
    notes: string;
    decisions: string[];
    nextSteps: string[];
    timestamp: number;
  },
): void {
  getDb()
    .prepare(
      `UPDATE meetings SET title=?, attendees_json=?, notes=?, decisions_json=?, next_steps_json=?, timestamp=?
       WHERE id=?`,
    )
    .run(
      row.title,
      JSON.stringify(row.attendees),
      row.notes,
      JSON.stringify(row.decisions),
      JSON.stringify(row.nextSteps),
      row.timestamp,
      id,
    );
}

export function deleteMeeting(id: string): void {
  getDb().prepare('DELETE FROM meetings WHERE id = ?').run(id);
}

// --- Alerts ---

export function listAlerts(): unknown[] {
  const rows = getDb()
    .prepare(
      'SELECT id, unit_id, timestamp, type, message, severity, is_read FROM alerts ORDER BY timestamp DESC LIMIT 200',
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id,
    unitId: r.unit_id,
    timestamp: r.timestamp,
    type: r.type,
    message: r.message,
    severity: r.severity,
    isRead: Boolean(r.is_read),
  }));
}

export function insertAlert(row: {
  id: string;
  unitId: string;
  timestamp: number;
  type: string;
  message: string;
  severity: string;
  isRead: boolean;
}): void {
  getDb()
    .prepare(
      `INSERT INTO alerts (id, unit_id, timestamp, type, message, severity, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.unitId,
      row.timestamp,
      row.type,
      row.message,
      row.severity,
      row.isRead ? 1 : 0,
    );
}

export function updateAlertRead(id: string, isRead: boolean): void {
  getDb().prepare('UPDATE alerts SET is_read = ? WHERE id = ?').run(isRead ? 1 : 0, id);
}

export function clearAlerts(): void {
  getDb().prepare('DELETE FROM alerts').run();
}

// --- Settings ---

export function getSettings(): Record<string, unknown> {
  const row = getDb()
    .prepare('SELECT settings_json FROM app_settings WHERE id = 1')
    .get() as { settings_json: string } | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    return JSON.parse(row.settings_json) as Record<string, unknown>;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSettings(json: Record<string, unknown>): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO app_settings (id, settings_json) VALUES (1, ?)')
    .run(JSON.stringify(json));
}

// --- Feedback ---

export function listFeedbackForUnit(unitId: string): unknown[] {
  const rows = getDb()
    .prepare(
      'SELECT id, unit_id, timestamp, score, comment FROM patient_feedback WHERE unit_id = ? ORDER BY timestamp DESC',
    )
    .all(unitId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id,
    unitId: r.unit_id,
    timestamp: r.timestamp,
    score: r.score,
    comment: r.comment,
  }));
}

export function insertFeedback(row: {
  id: string;
  unitId: string;
  timestamp: number;
  score: number;
  comment: string;
}): void {
  getDb()
    .prepare(
      'INSERT INTO patient_feedback (id, unit_id, timestamp, score, comment) VALUES (?, ?, ?, ?, ?)',
    )
    .run(row.id, row.unitId, row.timestamp, row.score, row.comment);
}

// --- Noise readings ---

export function insertReading(
  row: Omit<NoiseReadingRow, 'raw_status_json'> & { raw_status_json?: string | null },
): void {
  const database = getDb();
  const dedup = row.tuya_dedup_time;
  if (dedup != null) {
    const exists = database
      .prepare('SELECT 1 FROM noise_readings WHERE unit_id = ? AND tuya_dedup_time = ?')
      .get(row.unit_id, dedup);
    if (exists) return;
  }
  database
    .prepare(
      `INSERT INTO noise_readings (id, unit_id, timestamp_ms, decibels, raw_status_json, tuya_dedup_time)
       VALUES (@id, @unit_id, @timestamp_ms, @decibels, @raw_status_json, @tuya_dedup_time)`,
    )
    .run({
      id: row.id,
      unit_id: row.unit_id,
      timestamp_ms: row.timestamp_ms,
      decibels: row.decibels,
      raw_status_json: row.raw_status_json ?? null,
      tuya_dedup_time: dedup ?? null,
    });
}

export function getReadingsForUnit(unitId: string, limit: number): NoiseReadingRow[] {
  const rows = getDb()
    .prepare(
      `SELECT id, unit_id, timestamp_ms, decibels, raw_status_json, tuya_dedup_time
       FROM noise_readings
       WHERE unit_id = ?
       ORDER BY timestamp_ms DESC
       LIMIT ?`,
    )
    .all(unitId, limit) as NoiseReadingRow[];
  return rows.reverse();
}

export function getReadingsForUnitInTimeRange(
  unitId: string,
  fromMs: number,
  toMs: number,
  limit: number,
): NoiseReadingRow[] {
  return getDb()
    .prepare(
      `SELECT id, unit_id, timestamp_ms, decibels, raw_status_json, tuya_dedup_time
       FROM noise_readings
       WHERE unit_id = ? AND timestamp_ms >= ? AND timestamp_ms <= ?
       ORDER BY timestamp_ms ASC
       LIMIT ?`,
    )
    .all(unitId, fromMs, toMs, limit) as NoiseReadingRow[];
}

export function getReadingsForAllUnits(limitPerUnit: number): Record<string, NoiseReadingRow[]> {
  const units = getDb().prepare('SELECT id FROM units').all() as Array<{ id: string }>;
  const out: Record<string, NoiseReadingRow[]> = {};
  for (const u of units) {
    out[u.id] = getReadingsForUnit(u.id, limitPerUnit);
  }
  return out;
}

// --- Migrate from browser localStorage shape ---

export function migrateFromBrowserPayload(body: {
  units?: unknown[];
  staff?: unknown[];
  meetings?: unknown[];
  alerts?: unknown[];
  settings?: Record<string, unknown>;
}): void {
  const database = getDb();
  const tx = database.transaction(() => {
    if (Array.isArray(body.units) && body.units.length > 0) {
      database.prepare('DELETE FROM units').run();
      const ins = database.prepare(
        `INSERT INTO units (id, name, type, location, floor, department, target_decibel, device_name, tuya_device_id, created_at, reading_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const u of body.units as Array<Record<string, unknown>>) {
        const rs = u.readingSource === 'live' ? 'live' : 'demo';
        ins.run(
          u.id,
          u.name,
          u.type,
          u.location,
          u.floor,
          u.department,
          u.targetDecibel,
          u.deviceName,
          u.deviceId,
          u.createdAt ?? Date.now(),
          rs,
        );
      }
    }
    if (Array.isArray(body.staff) && body.staff.length > 0) {
      database.prepare('DELETE FROM staff').run();
      const ins = database.prepare(
        `INSERT INTO staff (id, name, role, unit_id, status, email, pincode, is_admin, notification_preferences_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const s of body.staff as Array<Record<string, unknown>>) {
        ins.run(
          s.id,
          s.name,
          s.role,
          s.unitId,
          s.status,
          s.email ?? null,
          s.pincode,
          s.isAdmin ? 1 : 0,
          JSON.stringify(s.notificationPreferences ?? {}),
        );
      }
    }
    if (Array.isArray(body.meetings)) {
      database.prepare('DELETE FROM meetings').run();
      const ins = database.prepare(
        `INSERT INTO meetings (id, timestamp, title, attendees_json, notes, decisions_json, next_steps_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const m of body.meetings as Array<Record<string, unknown>>) {
        ins.run(
          m.id,
          m.timestamp,
          m.title,
          JSON.stringify(m.attendees ?? []),
          m.notes ?? '',
          JSON.stringify(m.decisions ?? []),
          JSON.stringify(m.nextSteps ?? []),
        );
      }
    }
    if (Array.isArray(body.alerts)) {
      database.prepare('DELETE FROM alerts').run();
      const ins = database.prepare(
        `INSERT INTO alerts (id, unit_id, timestamp, type, message, severity, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const a of body.alerts as Array<Record<string, unknown>>) {
        ins.run(
          a.id,
          a.unitId,
          a.timestamp,
          a.type,
          a.message,
          a.severity,
          a.isRead ? 1 : 0,
        );
      }
    }
    if (body.settings && typeof body.settings === 'object') {
      setSettings(body.settings as Record<string, unknown>);
    }
  });
  tx();
}
