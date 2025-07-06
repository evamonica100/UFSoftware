import { NextRequest, NextResponse } from 'next/server';

declare global {
  var users: Map<string, any>;
}

if (!global.users) {
  global.users = new Map([
    ['admin@zekindo.co.id', { 
      password: 'admin123', 
      company: 'Zekindo', 
      role: 'admin',
      data: {} 
    }],
    ['demo@company.com', { 
      password: 'demo123', 
      company: 'Demo Company', 
      role: 'user',
      data: {} 
    }]
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, company } = await request.json();
    
    const user = global.users.get(email);
    if (!user || user.password !== password || user.company !== company) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    const { password: _, ...userData } = user;
    return NextResponse.json({ 
      message: 'Login successful', 
      user: { email, ...userData }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
