import { NextRequest, NextResponse } from 'next/server';

// GET /api/errors — get error list with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity');
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const allErrors = [
    { id: 'e1', time: '2025-08-10 14:32:05', code: 'ERR-2025-0810-0001', type: 'Connection', severity: 'Critical', message: 'WebSocket connection lost', resolved: false },
    { id: 'e2', time: '2025-08-10 13:15:42', code: 'ERR-2025-0810-0002', type: 'Order', severity: 'Critical', message: 'Order placement failed', resolved: false },
    { id: 'e3', time: '2025-08-10 12:48:20', code: 'ERR-2025-0810-0003', type: 'Risk', severity: 'Warning', message: 'Daily loss limit approaching', resolved: false },
    { id: 'e4', time: '2025-08-09 15:30:12', code: 'ERR-2025-0809-0001', type: 'Connection', severity: 'Critical', message: 'API rate limit exceeded', resolved: true },
    { id: 'e5', time: '2025-08-09 14:18:45', code: 'ERR-2025-0809-0002', type: 'Order', severity: 'Warning', message: 'Partial fill', resolved: true },
    { id: 'e6', time: '2025-08-09 11:45:33', code: 'ERR-2025-0809-0003', type: 'Signal', severity: 'Info', message: 'Signal expired', resolved: true },
    { id: 'e7', time: '2025-08-09 10:22:10', code: 'ERR-2025-0809-0004', type: 'Risk', severity: 'Warning', message: 'Max consecutive losses reached', resolved: true },
    { id: 'e8', time: '2025-08-08 15:28:00', code: 'ERR-2025-0808-0001', type: 'Engine', severity: 'Critical', message: 'Engine OOM killed', resolved: true },
    { id: 'e9', time: '2025-08-08 14:55:30', code: 'ERR-2025-0808-0002', type: 'Connection', severity: 'Warning', message: 'Slow API response', resolved: true },
    { id: 'e10', time: '2025-08-07 13:40:50', code: 'ERR-2025-0807-0001', type: 'Order', severity: 'Critical', message: 'Invalid order params', resolved: true },
  ];

  let filtered = allErrors;
  if (severity && severity !== 'all') {
    filtered = filtered.filter((e) => e.severity === severity);
  }
  if (type && type !== 'all') {
    filtered = filtered.filter((e) => e.type === type);
  }

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    errors: paginated,
    total: filtered.length,
    page,
    limit,
  });
}

// POST /api/errors/:id/resolve — mark error as resolved
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Error ID required' }, { status: 400 });
  }

  return NextResponse.json({ success: true, resolved: id });
}
