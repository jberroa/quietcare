import mqtt, { type MqttClient } from 'mqtt';
import { randomUUID } from 'crypto';
import { insertReading, resolveLiveUnitForIngest } from './db.js';

export interface MqttIngestState {
  connected: boolean;
  lastMessageAt: number | null;
}

let state: MqttIngestState = { connected: false, lastMessageAt: null };
let clientRef: MqttClient | null = null;

export function getMqttIngestState(): MqttIngestState {
  return { ...state };
}

function defaultTopics(): string[] {
  const raw = process.env.MQTT_TOPICS?.trim();
  if (!raw) return ['sound/#'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function decibelKey(): string {
  return (process.env.MQTT_PAYLOAD_DECIBEL_KEY || 'decibel').trim() || 'decibel';
}

/** 32-bit hash for ingest dedup index (same raw message → same key per unit). */
function dedupHash(topic: string, raw: string): number {
  const s = `${topic}\0${raw}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

function parseTimestampMs(iso: unknown): number | null {
  if (typeof iso !== 'string' || !iso.trim()) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Start MQTT subscriber; no-op if `MQTT_URL` is unset. Idempotent: ends prior client.
 */
export function startMqttIngest(): void {
  const url = process.env.MQTT_URL?.trim();
  if (!url) {
    state.connected = false;
    return;
  }

  if (clientRef) {
    try {
      clientRef.end(true);
    } catch {
      /* ignore */
    }
    clientRef = null;
  }

  const topics = defaultTopics();
  const user = process.env.MQTT_USERNAME?.trim();
  const pass = process.env.MQTT_PASSWORD;

  const client = mqtt.connect(url, {
    username: user || undefined,
    password: pass !== undefined && pass !== '' ? pass : undefined,
    reconnectPeriod: 5000,
  });
  clientRef = client;

  client.on('connect', () => {
    state.connected = true;
    console.log(`[mqtt] connected, subscribing: ${topics.join(', ')}`);
    for (const t of topics) {
      client.subscribe(t, { qos: 0 }, (err) => {
        if (err) console.error(`[mqtt] subscribe ${t}:`, err);
      });
    }
  });

  client.on('close', () => {
    state.connected = false;
  });

  client.on('offline', () => {
    state.connected = false;
  });

  client.on('error', (err) => {
    console.error('[mqtt]', err);
  });

  client.on('message', (topic, buf) => {
    const raw = buf.toString('utf8');
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.warn(`[mqtt] non-JSON payload on ${topic}`);
      return;
    }

    const dKey = decibelKey();
    const rawDec = body[dKey];
    const decibels =
      typeof rawDec === 'number'
        ? rawDec
        : typeof rawDec === 'string'
          ? Number(rawDec)
          : NaN;
    if (!Number.isFinite(decibels)) {
      console.warn(`[mqtt] missing or invalid "${dKey}" on ${topic}`);
      return;
    }

    const payloadDeviceId =
      typeof body.device_id === 'string' ? body.device_id : undefined;
    const unitId = resolveLiveUnitForIngest({ payloadDeviceId, topic });
    if (!unitId) {
      console.warn(`[mqtt] no live unit matches topic=${topic} device_id=${payloadDeviceId ?? ''}`);
      return;
    }

    const tsIso = body.timestamp;
    const timestampMs = parseTimestampMs(tsIso) ?? Date.now();

    insertReading({
      id: randomUUID(),
      unit_id: unitId,
      timestamp_ms: timestampMs,
      decibels: Math.round(decibels * 10) / 10,
      raw_status_json: raw,
      ingest_dedup_time: dedupHash(topic, raw),
    });

    state.lastMessageAt = Date.now();
  });
}
