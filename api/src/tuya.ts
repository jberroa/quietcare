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

/** Unix seconds from `result.<field>` (see TUYA_DEDUP_TIME_FIELD). Used to avoid duplicate rows per device snapshot. */
export function extractTuyaDedupTime(payload: unknown): number | null {
  const field = (process.env.TUYA_DEDUP_TIME_FIELD || 'update_time').trim();
  if (!field || !payload || typeof payload !== 'object') return null;
  const o = payload as Record<string, unknown>;
  const result = o.result;
  if (!result || typeof result !== 'object') return null;
  const r = result as Record<string, unknown>;
  const v = r[field];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
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
