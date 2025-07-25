import { NextResponse, type NextRequest } from 'next/server';
import { navItems } from './lib/nav-items';
import type { User } from './types';
import { base64UrlDecode } from './lib/auth';

function hasRole(userRoles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some(role => userRoles.includes(role));
}

function getFirstAccessibleUrl(userRoles: string[]): string | null {
  for (const group of navItems) {
    for (const item of group.items) {
      if (!item.roles || hasRole(userRoles, item.roles)) {
        return item.url;
      }
    }
  }
  return null;
}

function isAccessible(userRoles: string[], url: string): boolean {
  for (const group of navItems) {
    for (const item of group.items) {
      if (item.url === url && (!item.roles || hasRole(userRoles, item.roles))) {
        return true;
      }
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = ['/login'];
  const zaloLinkPath = '/dashboard/link-account';
  const token = request.cookies.get('access_token')?.value;
  let isValid = false;
  let userRoles: string[] = [];
  let zaloLinkStatus: number = 0;

  if (token) {
    try {
      const payload = JSON.parse(base64UrlDecode(token.split('.')[1]));
      const exp = payload.exp;
      if (exp && typeof exp === 'number' && exp > 0) {
        isValid = Date.now() < exp * 1000;
      }
      
      // Lấy roles từ payload - backend trả về array objects với name
      if (payload.roles && Array.isArray(payload.roles)) {
        userRoles = payload.roles.map((role: any) => role.name || role);
      }

      // Lấy zaloLinkStatus từ payload
      if (typeof payload.zaloLinkStatus === 'number') {
        zaloLinkStatus = payload.zaloLinkStatus;
      }
    } catch (error) {
      console.error('Token decode error:', error);
    }
  }

  // Kiểm tra zaloLinkStatus = 2 (lỗi liên kết) - chỉ redirect nếu có lỗi liên kết
  if (isValid && zaloLinkStatus === 2) {
    // Chỉ cho phép truy cập route liên kết tài khoản khi có lỗi
    if (pathname !== zaloLinkPath) {
      return NextResponse.redirect(new URL(zaloLinkPath, request.url));
    }
    // Nếu đang ở route liên kết, cho phép tiếp tục
    return NextResponse.next();
  }

  // Cho phép truy cập trang liên kết tài khoản bình thường (không chỉ khi có lỗi)
  if (isValid && pathname === zaloLinkPath) {
    return NextResponse.next();
  }

  if (isValid && (pathname === '/' || pathname === '/login' || pathname === '/dashboard')) {
    const firstUrl = getFirstAccessibleUrl(userRoles);
    if (firstUrl) {
      return NextResponse.redirect(new URL(firstUrl, request.url));
    }
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  if (!isValid) {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    
    // Nếu có refresh token, thử refresh access token
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.access_token) {
            const response = NextResponse.next();
            // Set new access token
            response.cookies.set('access_token', data.access_token, {
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 30 * 24 * 60 * 60, // 30 days
            });
            // Set new refresh token if provided
            if (data.refresh_token) {
              response.cookies.set('refresh_token', data.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60, // 30 days
              });
            }
            return response;
          }
        }
      } catch (error) {
        console.error('Token refresh failed in middleware:', error);
      }
    }
    
    const loginUrl = new URL('/login', request.url);
    if (!pathname.startsWith('/login')) {
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  const allUrls = navItems.flatMap((g: any) => g.items.map((i: any) => i.url));
  if (allUrls.includes(pathname) && !isAccessible(userRoles, pathname)) {
    const firstUrl = getFirstAccessibleUrl(userRoles);
    if (firstUrl) {
      return NextResponse.redirect(new URL(firstUrl, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};