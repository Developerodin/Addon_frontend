import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_BASE_URL } from '@/shared/data/utilities/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token found' },
        { status: 401 }
      );
    }

    // Fetch user data from the backend API
    const apiUrl = `${API_BASE_URL}/users/me`;
    console.log('Fetching user data from:', apiUrl);
    console.log('Using access token:', accessToken ? 'Present' : 'Missing');
    
    const backendResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Backend response status:', backendResponse.status);
    console.log('Backend response ok:', backendResponse.ok);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend API error:', backendResponse.status, backendResponse.statusText);
      console.error('Error response body:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch user data from backend', details: errorText },
        { status: backendResponse.status }
      );
    }

    const userData = await backendResponse.json();
    console.log('Fetched user data from backend:', userData);
    console.log('User navigation permissions:', userData.navigation);

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
