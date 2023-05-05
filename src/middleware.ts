import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://www.forum.nl", "https://app.forum.com"]
    : ["http://0.0.0.0:3000"];

export default createIntlMiddleware({
  locales: ["nl", "en"],
  defaultLocale: "en",
});

export const config = {
  // skip all paths that should not be internationalized
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

// nextjs.org/docs/advanced-features/middleware
// export function middleware(req: Request) {
//   console.log("[middleware]", {
//     url: req.url,
//     origin: req.headers.get("origin"),
//   });
//
//   const origin = req.headers.get("origin");
//   if ((origin && !allowedOrigins.includes(origin)) || !origin) {
//     return new NextResponse(null, {
//       status: 400,
//       statusText: "Bad Request",
//       headers: { "Content-Type": "text/plain" },
//     });
//   }
//
//   return NextResponse.next();
// }
