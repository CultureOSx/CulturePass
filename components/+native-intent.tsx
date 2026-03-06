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

  const remap = [
    ["/events/", "/event/"],
    ["/artists/", "/artist/"],
    ["/communities/", "/community/"],
    ["/profiles/", "/profile/"],
    // ...existing code...
  ];
  // ...existing code...
}
