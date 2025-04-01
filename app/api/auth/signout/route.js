import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    cookies().delete('session');
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Sign out error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 