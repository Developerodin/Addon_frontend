import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import fs from 'fs';
import path from 'path';

// Path to the private key file
const PRIVATE_KEY_PATH = path.join(process.cwd(), 'types', 'private-key.pem');

const getPrivateKey = () => {
    try {
        if (fs.existsSync(PRIVATE_KEY_PATH)) {
            return fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
        }
    } catch (error) {
        console.error('Error reading private key:', error);
    }
    return null;
};

export async function POST(request: NextRequest) {
    try {
        const text = await request.text();
        if (!text) {
            return new NextResponse('Missing message to sign', { status: 400 });
        }

        const privateKey = getPrivateKey();
        if (!privateKey) {
            return new NextResponse('Private key file not found on server', { status: 500 });
        }

        // QZ Tray Demo Certs often require RSA-SHA1.
        const sign = crypto.createSign('RSA-SHA1');
        sign.update(text);
        const signature = sign.sign(privateKey, 'base64');

        return new NextResponse(signature, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    } catch (error: any) {
        console.error('QZ Tray signing error:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
    }
}
