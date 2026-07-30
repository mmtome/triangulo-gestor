import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next 16 renomeou middleware para proxy. Aqui só fazemos a checagem otimista
// de presença do cookie de sessão — a verificação real do JWT acontece em
// requireUser(), dentro de cada página e Server Action.
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("tg_session");

  if (PUBLIC_PATHS.includes(pathname)) {
    if (hasSession) return NextResponse.redirect(new URL("/home", request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|brand|favicon.ico).*)"],
};
