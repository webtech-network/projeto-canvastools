import Image from 'next/image';
import webtechLogo from '@/assets/images/webtech-logo.png';

export default function WebTechFooter() {
  return (
    <footer className="webtech-footer">
      <a href="https://webtech.network/" target="_blank" rel="noopener noreferrer" className="webtech-footer-link">
        <Image src={webtechLogo} alt="WebTech Network" className="webtech-footer-logo" />
      </a>
      <p>
        CanvasTools é um projeto do{' '}
        <a href="https://webtech.network/" target="_blank" rel="noopener noreferrer">
          WebTech Network
        </a>
        , projeto de extensão da PUC Minas.
      </p>
    </footer>
  );
}
