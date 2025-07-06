import { NextRequest, NextResponse } from 'next/server';

// Initialize users in a way that persists in serverless environment
const initializeUsers = () => {
  const users = new Map([
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
  return users;
};

// Use a more persistent approach
let usersStore: Map<string, any>;

const getUsers = () => {
  if (!usersStore) {
    usersStore = initializeUsers();
  }
  return usersStore;
};

export async function POST(request: NextRequest) {
  try {
    const { email, password, company } = await request.json();
    
    const users = getUsers();
    const user = users.get(email);
    
    console.log('Login attempt for:', email);
    console.log('User found:', !!user);
    console.log('Password match:', user?.password === password);
    console.log('Company match:', user?.company === company);
    
    if (!user || user.password !== password || user.company !== company) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Store reference for other API routes
    global.users = users;
    
    const { password: _, ...userData } = user;
    return NextResponse.json({ 
      message: 'Login successful', 
      user: { email, ...userData }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
