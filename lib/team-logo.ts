// ESPN publishes NCAA logos for dark surfaces alongside its default assets.
// Only rewrite that known CDN path; custom/provider URLs keep their own artwork.
export function darkTeamLogo(logo: string): string {
  try {
    const url = new URL(logo);
    if (url.hostname !== 'a.espncdn.com' || !['http:', 'https:'].includes(url.protocol)) return logo;
    const match = url.pathname.match(/^\/i\/teamlogos\/ncaa\/(?:200|500)\/(\d+)\.png$/);
    if (!match) return logo;
    url.protocol = 'https:';
    url.pathname = `/i/teamlogos/ncaa/500-dark/${match[1]}.png`;
    return url.toString();
  } catch {
    return logo;
  }
}
