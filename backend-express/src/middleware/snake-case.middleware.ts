import { Request, Response, NextFunction } from 'express';

function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function serializeDate(d: Date): string {
  // Campos @db.Date do Prisma sempre retornam meia-noite UTC.
  // Campos DateTime retornam com hora real → manter ISO completo.
  const isMidnightUTC =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;

  return isMidnightUTC
    ? d.toISOString().slice(0, 10)   // "2024-06-23"  (date-only)
    : d.toISOString();                // "2024-06-23T14:30:00.000Z" (datetime)
}

function transformKeys(value: unknown): unknown {
  if (value instanceof Date) return serializeDate(value);
  if (Array.isArray(value)) return value.map(transformKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [toSnake(k), transformKeys(v)]),
    );
  }
  return value;
}

export function snakeCaseResponse(_req: Request, res: Response, next: NextFunction): void {
  const original = res.json.bind(res);
  res.json = (data: unknown) => original(transformKeys(data));
  next();
}
