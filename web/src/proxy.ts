/**
 * Request gate (Next 16 `proxy`, formerly middleware).
 *
 * - /app/* pages are open. The first visit gets the demo cookie set
 *   automatically (there are no accounts; the old persona-picker wall only
 *   added a click and broke "Skip to the data").
 * - The analyst POST needs the same cookie, so the BFF is not an open relay
 *   that anyone can script against the API key. The simulator stays public
 *   (the landing page's predictor uses it; it is cheap arithmetic), and both
 *   are rate-limited per visitor in the proxy route itself.
 */

import { NextRequest, NextResponse } from "next/server";

const PERSONA_COOKIE = "fiq_persona";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPersona = request.cookies.has(PERSONA_COOKIE);

  if (pathname.startsWith("/api/proxy/")) {
    if (
      request.method === "POST" &&
      pathname.startsWith("/api/proxy/v1/analyst/") &&
      !hasPersona
    ) {
      return NextResponse.json(
        {
          type: "about:blank",
          title: "Demo session required",
          status: 401,
          detail: "Open the demo from the home page to use interactive features.",
        },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  const response = NextResponse.next();
  if (pathname.startsWith("/app") && !hasPersona) {
    response.cookies.set(PERSONA_COOKIE, "visitor", {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}

export const config = { matcher: ["/app/:path*", "/api/proxy/:path*"] };
