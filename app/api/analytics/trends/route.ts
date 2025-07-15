import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/shared/data/utilities/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');
    const store = searchParams.get('store');
    const product = searchParams.get('product');

    // Build query parameters
    const params = new URLSearchParams();
    if (startMonth) params.append('startMonth', startMonth);
    if (endMonth) params.append('endMonth', endMonth);
    if (store) params.append('store', store);
    if (product) params.append('product', product);

    // Proxy to backend API
    const backendUrl = `${API_BASE_URL}/analytics/trends?${params.toString()}`;
    
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
    console.error('Error fetching trends data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends data from backend' },
      { status: 500 }
    );
  }
} 