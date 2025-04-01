import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'authenticated' });
}

export async function POST(request) {
  try {
    const data = await request.json();
    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 