import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/authActions';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}
