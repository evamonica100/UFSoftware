import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, data } = await request.json();
    
    const user = global.users?.get(email);
    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    user.data = { ...user.data, ...data, lastSaved: new Date() };
    global.users.set(email, user);
    
    return NextResponse.json({ message: 'Data saved successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
