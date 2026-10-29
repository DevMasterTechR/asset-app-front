/**
 * Firma del desarrollador. No se ve en la pantalla: solo sale en la consola del
 * navegador y al teclear el código Konami (↑ ↑ ↓ ↓ ← → ← → B A) fuera de un campo de texto.
 */
(() => {
  const GATA = "<svg viewBox=\"0 0 120 130\" width=\"120\" height=\"130\" role=\"img\"> <path class=\"tr-gata-cola\" d=\"M92 112 C120 108 118 76 102 82\" fill=\"none\" stroke=\"#1d2029\" stroke-width=\"9\" stroke-linecap=\"round\" /> <ellipse cx=\"60\" cy=\"104\" rx=\"34\" ry=\"26\" fill=\"#1d2029\" /> <path d=\"M43 76 Q60 70 77 76 Q86 100 67 126 Q60 130 53 126 Q34 100 43 76 Z\" fill=\"#f8fafc\" /> <path d=\"M30 40 L30 8 L52 26 Z\" fill=\"#1d2029\" /><path d=\"M90 40 L90 8 L68 26 Z\" fill=\"#1d2029\" /> <path d=\"M35 33 L35 16 L46 26 Z\" fill=\"#3b3f4c\" /><path d=\"M85 33 L85 16 L74 26 Z\" fill=\"#3b3f4c\" /> <ellipse cx=\"60\" cy=\"48\" rx=\"31\" ry=\"27\" fill=\"#1d2029\" /> <ellipse cx=\"60\" cy=\"70\" rx=\"9\" ry=\"5\" fill=\"#f8fafc\" /> <ellipse cx=\"47\" cy=\"46\" rx=\"8.5\" ry=\"9\" fill=\"#c8c34a\" /><ellipse cx=\"73\" cy=\"46\" rx=\"8.5\" ry=\"9\" fill=\"#c8c34a\" /> <ellipse cx=\"47\" cy=\"46\" rx=\"3.6\" ry=\"6.5\" fill=\"#0b0d12\" /><ellipse cx=\"73\" cy=\"46\" rx=\"3.6\" ry=\"6.5\" fill=\"#0b0d12\" /> <circle cx=\"49.5\" cy=\"42.5\" r=\"1.8\" fill=\"#fff\" /><circle cx=\"75.5\" cy=\"42.5\" r=\"1.8\" fill=\"#fff\" /> <path d=\"M55.5 57 L64.5 57 L60 62.5 Z\" fill=\"#4b5563\" /> <path d=\"M60 62.5 Q56 67 52 64.5 M60 62.5 Q64 67 68 64.5\" fill=\"none\" stroke=\"#6b7280\" stroke-width=\"1.4\" stroke-linecap=\"round\" /> <path d=\"M44 62 L14 56 M44 65 L14 69 M45 59 L20 47 M76 62 L106 56 M76 65 L106 69 M75 59 L100 47\" fill=\"none\" stroke=\"#1d2029\" stroke-opacity=\".5\" stroke-width=\"2.8\" stroke-linecap=\"round\" /> <path d=\"M44 62 L14 56 M44 65 L14 69 M45 59 L20 47 M76 62 L106 56 M76 65 L106 69 M75 59 L100 47\" fill=\"none\" stroke=\"#f8fafc\" stroke-width=\"1.2\" stroke-linecap=\"round\" /> </svg>";
  const CLAVE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  function mostrarFirma() {
    if (!document.getElementById('tr-firma-estilo')) {
      const estilo = document.createElement('style');
      estilo.id = 'tr-firma-estilo';
      estilo.textContent =
        '@keyframes tr-gata-entra{from{opacity:0;transform:translateY(40px) scale(.8)}to{opacity:1;transform:none}}' +
        '@keyframes tr-gata-cola{from{transform:rotate(-12deg)}to{transform:rotate(14deg)}}' +
        '.tr-gata-cola{transform-origin:92px 112px;animation:tr-gata-cola .8s ease-in-out infinite alternate}';
      document.head.append(estilo);
    }
    const aviso = document.createElement('div');
    aviso.setAttribute('role', 'status');
    aviso.textContent = '< / > hecho a mano por Bryan Quispe · bryan406';
    aviso.style.cssText =
      'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483000;background:#101827;color:#d8f34a;font:700 13px system-ui,sans-serif;padding:10px 18px;border-radius:12px;box-shadow:0 10px 30px rgba(16,24,39,.35);transition:opacity .5s;opacity:1;pointer-events:none';
    const gata = document.createElement('div');
    gata.setAttribute('aria-hidden', 'true');
    gata.innerHTML = GATA;
    gata.style.cssText =
      'position:fixed;right:18px;bottom:70px;z-index:2147483000;pointer-events:none;animation:tr-gata-entra .45s cubic-bezier(.2,.9,.3,1.2) both;transition:opacity .4s';
    document.body.append(aviso, gata);
    setTimeout(() => { aviso.style.opacity = '0'; gata.style.opacity = '0'; }, 4000);
    setTimeout(() => { aviso.remove(); gata.remove(); }, 4600);
  }

  function vigilarCodigo() {
    console.log(
      '%c bryan406 %c hecho a mano por Bryan Quispe ',
      'background:#101827;color:#d8f34a;font:700 12px monospace;padding:3px 6px;border-radius:4px 0 0 4px',
      'background:#d8f34a;color:#101827;font:700 12px monospace;padding:3px 6px;border-radius:0 4px 4px 0',
    );
    let avance = 0;
    const alTeclear = (evento: KeyboardEvent) => {
      const destino = evento.target as HTMLElement | null;
      if (destino && /^(input|textarea|select)$/i.test(destino.tagName || '')) { avance = 0; return; }
      const tecla = evento.key.length === 1 ? evento.key.toLowerCase() : evento.key;
      avance = tecla === CLAVE[avance] ? avance + 1 : tecla === CLAVE[0] ? 1 : 0;
      if (avance < CLAVE.length) return;
      avance = 0;
      mostrarFirma();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }
  vigilarCodigo();
})();
export {};
