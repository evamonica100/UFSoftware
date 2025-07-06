import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    const user = global.users?.get(email);
    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ data: user.data || {} });
  } catch (error) {
    return NextResponse.json({ error: 'Load failed' }, { status: 500 });
  }
}
