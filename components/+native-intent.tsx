export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  if (!path) {
    return "/";
  }

  const [rawPath, rawQuery] = path.split("?");
  const cleanPath = rawPath || "/";
  const querySuffix = rawQuery ? `?${rawQuery}` : "";

  const remap: [string, string][] = [
    ["/events/", "/event/"],
    ["/artists/", "/artist/"],
    ["/communities/", "/community/"],
    ["/profiles/", "/profile/"],
  ];

  for (const [from, to] of remap) {
    if (cleanPath.startsWith(from)) {
      return cleanPath.replace(from, to) + querySuffix;
    }
  }

  return cleanPath + querySuffix;
}
