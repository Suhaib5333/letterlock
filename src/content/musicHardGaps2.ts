import type { RawQuestion } from '../core/packs';

/**
 * Round-2 top-up for Music · Hard — fills the still-skinny X letter
 * (only Xylophone + Xiu Xiu in allAnswers; Iannis Xenakis already in
 * musicHardGaps.X). Deep-cut additions: an extended-range orchestral
 * mallet instrument used by Messiaen and Boulez, a Japanese metal band,
 * and an ancient Chinese vessel flute.
 */
export const musicHardGaps2: Record<string, RawQuestion[]> = {
  X: [
    {
      q: 'The extended-range mallet percussion instrument — a hybrid of xylophone and marimba spanning roughly five octaves — featured in Messiaen\'s "Turangalîla-Symphonie" and Boulez\'s "Le Marteau sans maître".',
      a: 'Xylorimba',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'The Japanese rock band co-founded in 1982 by drummer Yoshiki and vocalist Toshi, credited with launching the "visual kei" movement; their original lead guitarist hide died in 1998.',
      a: 'X Japan',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'An ancient Chinese globular vessel flute, traditionally made of clay and dated back some 7,000 years; egg-shaped with finger holes, it has a soft, breathy tone.',
      a: 'Xun',
      category: 'music',
      difficulty: 5,
    },
  ],
};
