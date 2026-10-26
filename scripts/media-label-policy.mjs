// Customer-facing media labels are separate from internal provenance records and article citations.
export function findVisibleMediaAttribution(html) {
  const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const attributes = [...markup.matchAll(/\b(?:alt|title|aria-label|content)="([^"]*)"/g)].map(match => match[1]).join(' ');
  const text = markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ') + ' ' + attributes;
  return [
    /\bthird-party\s+(?:(?:AI|style|dance)\s+)?(?:references?|examples?|footage|media|clips?)/i,
    /\buser-supplied\s+(?:clip|reference|comparison)/i,
    /\b(?:Copy That Video|NowStarring|Kavel AI|AIReel|kdafirestarter\.com|bbywowguyai\.app|windowpeeperaivideo\.com)\b/i,
    /(?<![\w.])@[a-z0-9_][a-z0-9_.]*/i,
    /\b(?:media|videos?|clips?|photos?|references?)\s+(?:are\s+)?credited\s+(?:to|beside|on)/i,
    /\b(?:video credits|video sources) appear beside/i,
  ].find(pattern => pattern.test(text));
}
