import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/google-sheets';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fraksi = searchParams.get('fraksi') as "Fraksi 1" | "Fraksi 2" | null;
    
    if (!fraksi || (fraksi !== "Fraksi 1" && fraksi !== "Fraksi 2")) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or missing fraksi parameter' },
        { status: 400 }
      );
    }
    
    // Check cache first
    const cacheKey = `sheets-${fraksi}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({ 
        ok: true, 
        data: cached.data,
        fraksi: fraksi,
        cached: true
      }, { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'CDN-Cache-Control': 'public, s-maxage=30',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=30'
        }
      });
    }
    
    const result = await getSheetData(fraksi);
    
    // Cache the result
    cache.set(cacheKey, {
      data: result.data,
      timestamp: now
    });
    
    // Clean up old cache entries periodically
    if (cache.size > 10) {
      const entries = Array.from(cache.entries());
      entries.forEach(([key, value]) => {
        if (now - value.timestamp > CACHE_DURATION * 2) {
          cache.delete(key);
        }
      });
    }
    
    return NextResponse.json({ 
      ok: true, 
      data: result.data,
      fraksi: fraksi 
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, s-maxage=30',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=30'
      }
    });
    
  } catch (error) {
    console.error('Error in /api/sheets/fetch:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}