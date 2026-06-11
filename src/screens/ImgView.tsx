/**
 * Standalone "secret prompt" view opened by scanning the charade QR code
 * (`?view=img&w=<name>&img=<url>`). Shows the thing's IMAGE plus its NAME so the
 * acting player can see their prompt privately on their phone. Rendered outside
 * the game store (a deep-linkable page) — see main.tsx.
 */
export function ImgView() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('w') ?? '';
  const img = params.get('img') ?? '';
  const hint = params.get('h') ?? 'Act it out — no talking!';

  return (
    <div className="imgview" data-testid="imgview">
      <div className="imgview-card">
        <div className="imgview-tag">Your secret prompt</div>
        {img && (
          <div className="imgview-imgwrap">
            <img className="imgview-img" src={img} alt={name} draggable={false} />
          </div>
        )}
        <h1 className="imgview-name" data-testid="imgview-name">{name}</h1>
        <p className="imgview-hint">{hint}</p>
        <p className="imgview-foot">Don't show this screen to the other team! 🤫</p>
      </div>
    </div>
  );
}
