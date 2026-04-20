import { TuyaContext } from '@tuya/tuya-connector-nodejs';

export type DeviceStatusMode = 'legacy' | 'iot03';

function parseStatusEntries(payload: unknown): Array<{ code: string; value: unknown }> {
  if (payload == null) return [];
  if (Array.isArray(payload)) {
    return payload.filter(
      (x): x is { code: string; value: unknown } =>
        typeof x === 'object' &&
        x !== null &&
        'code' in x &&
        typeof (x as { code: unknown }).code === 'string',
    ) as Array<{ code: string; value: unknown }>;
  }
  if (typeof payload !== 'object') return [];
  const o = payload as Record<string, unknown>;
  if (Array.isArray(o.result)) {
    return parseStatusEntries(o.result);
  }
  if (o.result && typeof o.result === 'object' && Array.isArray((o.result as { status?: unknown }).status)) {
    return parseStatusEntries((o.result as { status: unknown[] }).status);
  }
  return [];
}

export function extractDecibelFromStatus(
  statusPayload: unknown,
  dpCode: string,
  scale: number,
): number | null {
  const entries = parseStatusEntries(statusPayload);
  const hit = entries.find((e) => e.code === dpCode);
  if (!hit) return null;
  const v = hit.value;
  let n: number;
  if (typeof v === 'number' && Number.isFinite(v)) n = v;
  else if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) n = Number(v);
  else return null;
  return Math.round(n * scale * 100) / 100;
}

let context: TuyaContext | null = null;

export function getTuyaContext(): TuyaContext | null {
  const accessKey = process.env.TUYA_ACCESS_KEY;
  const secretKey = process.env.TUYA_SECRET_KEY;
  const baseUrl = process.env.TUYA_BASE_URL || 'https://openapi.tuyaus.com';
  if (!accessKey || !secretKey) {
    return null;
  }
  if (!context) {
    context = new TuyaContext({
      baseUrl,
      accessKey,
      secretKey,
    });
  }
  return context;
}

/**
 * Stored in `noise_readings.tuya_dedup_time` to skip identical API responses.
 *
 * `TUYA_DEDUP_TIME_FIELD` (default `t`):
 * - `t` — root envelope timestamp in ms (unique per Tuya response; use when `result.update_time`
 *   stays stale while `status` values change)
 * - `update_time` / `active_time` / other — read numeric `result.<field>` (unix seconds)
 * - `none` — no dedup (insert every successful poll)
 */
export function extractTuyaDedupTime(payload: unknown): number | null {
  const field = (process.env.TUYA_DEDUP_TIME_FIELD || 't').trim().toLowerCase();
  if (!field || field === 'none' || field === 'off') return null;
  if (!payload || typeof payload !== 'object') return null;
  const o = payload as Record<string, unknown>;
  const result = o.result;

  const rootT = o.t;
  const rootTnum =
    typeof rootT === 'number' && Number.isFinite(rootT) ? Math.trunc(rootT) : null;

  if (field === 't') {
    if (rootTnum != null) return rootTnum;
  } else if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    const v = r[field];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }

  if (rootTnum != null) return rootTnum;
  if (result && typeof result === 'object') {
    const u = (result as Record<string, unknown>).update_time;
    if (typeof u === 'number' && Number.isFinite(u)) return u;
  }
  return null;
}

export async function fetchDeviceStatusRaw(
  deviceId: string,
  mode: DeviceStatusMode,
): Promise<unknown> {
  const ctx = getTuyaContext();
  if (!ctx) {
    throw new Error('Tuya is not configured (set TUYA_ACCESS_KEY and TUYA_SECRET_KEY)');
  }
  if (mode === 'iot03') {
    return ctx.deviceStatus.status({ device_id: deviceId });
  }
  return ctx.request({
    method: 'GET',
    path: `/v1.0/devices/${deviceId}`,
  });
}
