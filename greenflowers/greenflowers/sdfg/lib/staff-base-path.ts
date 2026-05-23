/** Префикс URL панели админа или работника для общих страниц. */
export function staffBasePathFromPathname(
  pathname: string | null,
): "/admin" | "/employee" {
  const p = pathname ?? "";
  return p.startsWith("/employee") ? "/employee" : "/admin";
}
