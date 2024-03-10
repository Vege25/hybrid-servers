import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getUserByUsername } from '@/models/userModel';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { TokenContent } from '@sharedTypes/DBTypes';
import { redirect } from 'next/navigation';

const secretKey = 'secret';
const key = new TextEncoder().encode(secretKey);

export async function login(formData: FormData) {
  // Verify credentials && get the user

  const user = await getUserByUsername(formData.get('username') as string);

  if (!user) {
    throw new Error('Incorrect username/password');
  }

  if (
    user.password &&
    !bcrypt.compareSync(formData.get('password') as string, user.password)
  ) {
    throw new Error('Incorrect username/password');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT secret not set');
  }

  // Create the token object
  const tokenContent: TokenContent = {
    user_id: user.user_id,
    level_name: user.level_name,
  };

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = jwt.sign(tokenContent, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  // Save the token object in a cookie
  cookies().set('session', session, { expires, httpOnly: true });
}

export async function logout() {
  // Destroy the session
  cookies().set('session', '', { expires: new Date(0) });
}

export function getSession(): TokenContent | null {
  const session = cookies().get('session')?.value;
  if (!session) return null;
  return jwt.verify(session, process.env.JWT_SECRET as string) as TokenContent;
}

export function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;

  // Refresh the session so it doesn't expire
  const parsed = jwt.verify(session, process.env.JWT_SECRET as string);
  const res = NextResponse.next();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  res.cookies.set({
    name: 'session',
    value: jwt.sign(parsed, process.env.JWT_SECRET as string, {
      expiresIn: '7d',
    }),
    httpOnly: true,
    expires: expires,
  });
  return res;
}

export function requireAuth() {
  const session = getSession();
  if (!session?.user_id) {
    redirect('/');
  }
}
