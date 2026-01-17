import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Path to the digital certificate file
const CERTIFICATE_PATH = path.join(process.cwd(), 'types', 'digital-certificate.txt');

export async function GET() {
    try {
        if (!fs.existsSync(CERTIFICATE_PATH)) {
            return new NextResponse('Certificate file not found', { status: 404 });
        }

        const certificate = fs.readFileSync(CERTIFICATE_PATH, 'utf8');

        return new NextResponse(certificate, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    } catch (error: any) {
        console.error('Error serving QZ certificate:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
    }
}
