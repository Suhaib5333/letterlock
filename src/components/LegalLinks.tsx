import { ImageCreditsLink } from './ImageCredits';

/** Privacy + Terms links (static pages under public/), opened in a new tab, plus Image credits. */
export function LegalLinks({ className = '' }: { className?: string }) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <span className={`legal-links ${className}`} data-testid="legal-links">
      <a href={`${base}/privacy.html`} target="_blank" rel="noopener noreferrer">Privacy</a>
      <span aria-hidden="true"> · </span>
      <a href={`${base}/terms.html`} target="_blank" rel="noopener noreferrer">Terms</a>
      <span aria-hidden="true"> · </span>
      <ImageCreditsLink />
    </span>
  );
}
