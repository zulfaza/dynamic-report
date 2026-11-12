/**
 * The page to open after sign-in, from `?returnPathname=`. Only a path on
 * this origin is accepted, so the link cannot send the user to another site.
 */
export const safeReturnPathname = (request: Request): string => {
  const value = new URL(request.url).searchParams.get("returnPathname")

  // "//host" and "/\host" both open another host in a browser.
  return value !== null && /^\/(?![/\\])/.test(value) ? value : "/"
}

/** The sign-in link that returns to `href` (path, search and hash). */
export const signInHref = (href: string): string =>
  `/sign-in?returnPathname=${encodeURIComponent(href)}`
