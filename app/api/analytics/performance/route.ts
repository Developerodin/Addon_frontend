import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/shared/data/utilities/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'store';
    const limit = parseInt(searchParams.get('limit') || '10');
    const month = searchParams.get('month');

    // Build query parameters
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('limit', limit.toString());
    if (month) params.append('month', month);

    // Proxy to backend API
    const backendUrl = `${API_BASE_URL}/analytics/performance?${params.toString()}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data from backend' },
      { status: 500 }
    );
  }
} 