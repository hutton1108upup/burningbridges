// Product availability must not be inferred from a single worktree's implementation.
// These rules target static marketing copy, not genuine runtime failure messages.
export const worktreeRestrictionCopy = [
  /\bgeneration is not (?:included|offered|supported)\b/i,
  /\b(?:effect|scene|dance|duet|template) is not (?:currently )?(?:included|available|a purchasable)/i,
  /\b(?:this site|this page|our site|our page)\b[^.!?]{0,150}\b(?:does not|do not) (?:offer|support|generate|create|submit)\b/i,
  /\b(?:paid generation|credit plans?|paid plans?)\b[^.!?]{0,130}\b(?:party[- ](?:video )?template only|separate (?:Burning Bridges )?party)/i,
  /\b(?:credits?|plans?|packs?|purchases?)\b[^.!?]{0,90}\b(?:does not|do not|not) (?:unlock|enable|generate|give you)\b/i,
  /\b(?:credits?|plans?|packs?|purchases?)\b[^.!?]{0,90}\b(?:does not|do not|not) include\b[^.!?]{0,70}\b(?:template|scene|generation|effect|dance|duet)\b/i,
  /\b(?:only|exclusively)\b[^.!?]{0,60}\bBurning Bridges\b[^.!?]{0,60}\b(?:template|supported)/i,
  /\bnot (?:a dance generator|a purchasable template|this scene.s generation)\b/i,
  /\b(?:this|our) (?:page|site)\b[^.!?]{0,80}\b(?:reference[- ]only|preview[- ]only|only (?:provides?|offers?|supports?) (?:references?|previews?))/i,
  /\b(?:here|this page)\b[^.!?]{0,50}\bno (?:video job|generation|render)\b/i,
  /\blocal (?:photo|portrait) (?:preview|preparation)\b[^.!?]{0,150}\bno (?:video render|rendered or downloadable)/i,
];

export function findWorktreeRestriction(copy) {
  const text = copy.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  return worktreeRestrictionCopy.find(pattern => pattern.test(text));
}
