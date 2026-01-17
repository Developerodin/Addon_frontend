import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// The private key provided by the user
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCyHq9PWKlgWckI
/1+qBXc29yGQnDet70+NQYTj/FG50nnGLIK5U8seWrO0L2bisPOEvppAZFP1l3G2
pHySQ8j0z2sqTQyhwUCwKFZU3VmyApITF39AiRXtN3QfYLFFhjQqrC7QIhwErGsg
4iNmthaN5U2qkgLqoNJxoTE0o5v20aGIt2f9k8AbFbUWmgQU3WzkqWbfxbhl0DPO
fah0aOROnwB27cnzW1Zp4aOO3IyXl6CPf1LIn0ahULVbhvjyTysjVMzY6WD0JnOO
uH7ocLZgNo63IxhD+T6N6vslhS/a2sN96B1mzu33wESIpGsryM2MsLsATAwKBva4
beD8uBDjAgMBAAECggEAAih9S/txYEdrL3gIqElXSa80mVIqItHLWCJk41PNZLto
0VkOgn73EoXXGGYEA3Z0cd08zRY9+cWZ6eCc4laZBdac/NRuBsCJppjCqRgpW/1H
2KVN5Lh94BKe1OHx8A87Y/WpkioXoykQ5OI1P70Re1/CF+iBIevi2kExmToXx1Y0
n/liS7P7bUHdYmOiJ10unkTeUjL/9/EBEC/YctBjLt1L912VZLtxJ+ZIy+/LTnHw
Uo/WjtyjVeemmFCCn8L8oGGPZ62sqWC53tEMeDfnUyD0dtKR+WM6QYPtiu9RNir3
QVp+nxriMGzZBiJNWmUyYyCvt2+oBG5VFqdMFG63IQKBgQDX7MGopxMS7MVEDbNP
g5xyb0QsOOfAKPgPm4aVt5W3xF9b1Hdi4eZtoGV517WrdM+WB4/Sse1rgut7oAVE
ChskAak5jrsxXGReJZk6h2bnFuD8Uv51+1x3asCRLPw52lKYOxWbrs9SIunwWnZF
bJKgRmuCiGLE5SDt6eUn54JHnQKBgQDTLbMdWQOxGD37EbvAoUxj2Iu5xiWH2oYs
zCyhMwRg2lBAMO0b1p+csWLb2RzOlRs8tPlShzwQdeDzfB4V78bpoYVm9NrVOpiG
xckNXUWLKawPJmwPEKP2kS+b6zqP023UfZ9VIrmCwI8ofFlm47Kn/UlUFnZqmeQq
gbP/hIuSfwKBgGxUbBShPgCQqaeq9/s8nJENIbbOFfdilpG+BZe3s3WvH+iCgCMs
Et+NSVwHzS1oPX2X7aBXhDYcSOiNMBciutslujEWWvQ41mIlmuqyY/4sjFQLj37B
zXJcLKCpYSHlVurpOb4RxhH/Uj80I4JRJn8i1W1335XJHuw+HKoYjFRBAoGBAKv4
Rik7CNeZjze63DNk5ulUOYzCQGPeX29xoVJwUjtw7PMpJJ2L7JTUm1W++0d7gx+v
nG1JdW9OHy8IvxNMHKa7AwCxmtcTjYwK2swITY6jE9uOhWbLPUqYNrX5G8pt+b2V
wz+4NGu21Z25jbBM8nr8t09Dr5Dl2zmGQAdvb52PAoGBAJ6GWqCqwPW8pa9ZVXY/
xGjleo24gWa8wyJAM+baKkwKdViEStO02xgcTHXz0DhAuXXArVsJCEg1KHDLKvS/
6nRL+roWE0aITOx+bgr/ZaSKVlHCDeK9rJ1v/Bp0krUht9eHPj8K6Asb3PgPCIhM
sjF/VicJng3iy00/eWRBNSNZ
-----END PRIVATE KEY-----`;

export async function POST(request: NextRequest) {
    try {
        const text = await request.text();
        if (!text) {
            return new NextResponse('Missing message to sign', { status: 400 });
        }

        // QZ Tray Demo Certificates often require RSA-SHA1.
        const sign = crypto.createSign('RSA-SHA1');
        sign.update(text);
        const signature = sign.sign(PRIVATE_KEY, 'base64');

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
