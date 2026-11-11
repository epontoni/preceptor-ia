// src/app/api/ai/query/route.ts
import { NextResponse } from 'next/server';
import { processPreceptorQuery } from '@/lib/ai/preceptor-brain';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Se requiere un prompt de consulta válido' },
        { status: 400 }
      );
    }

    const result = await processPreceptorQuery(prompt);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
