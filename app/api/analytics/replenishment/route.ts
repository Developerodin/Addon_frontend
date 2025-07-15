import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/shared/data/utilities/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store');
    const product = searchParams.get('product');
    const month = searchParams.get('month');

    // Build query parameters
    const params = new URLSearchParams();
    if (store) params.append('store', store);
    if (product) params.append('product', product);
    if (month) params.append('month', month);

    // Proxy to backend API
    const backendUrl = `${API_BASE_URL}/analytics/replenishment?${params.toString()}`;
    
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
    console.error('Error fetching replenishment data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replenishment data from backend' },
      { status: 500 }
    );
  }
} 