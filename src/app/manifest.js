// Next.js App Router manifest convention — auto-detected, served at
// /manifest.webmanifest, and auto-linked in <head> (no need to touch
// layout.jsx for that part). Icons generated from docs/Identidade
// Visual/canvastools_icon.png (see public/icons/) — the transparent,
// text-free glyph, not the small text+logo thumbnail, since it holds up at
// every declared size and isn't clipped in the maskable safe zone as badly.
export default function manifest() {
  return {
    name: 'CanvasTools',
    short_name: 'CanvasTools',
    description: 'Painel de professor para Canvas LMS — cursos, tarefas, mensagens e correção.',
    start_url: '/',
    display: 'standalone',
    background_color: '#eef3f9', // --paper
    theme_color: '#173a60', // --brand, same as the permanently-dark sidebar
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
