import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, data } = await request.json();
    
    console.log('Save request for:', email);
    
    // Make sure we have the users
    if (!global.users) {
      console.log('Users not found, reinitializing...');
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
    
    const user = global.users.get(email);
    console.log('User found for save:', !!user);
    
    if (!user || user.password !== password) {
      console.log('Save auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    user.data = { ...user.data, ...data, lastSaved: new Date() };
    global.users.set(email, user);
    
    console.log('Data saved successfully for:', email);
    
    return NextResponse.json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
