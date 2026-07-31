import Image from 'next/image';
import { getSession, isSessionValid } from '@/lib/session';
import banner from '@/assets/images/banner_og.jpeg';
import TutorialExplorer from '@/components/TutorialExplorer';

export default async function TutorialPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null; // proxy already redirects unauthenticated requests to /login
  }

  const firstName = session.user?.name?.split(' ')[0];

  return (
    <main className="page tutorial-page">
      <div className="tutorial-banner">
        <Image src={banner} alt="CanvasTools" priority />
      </div>

      <h1>Bem-vindo(a){firstName ? `, ${firstName}` : ''}!</h1>
      <p className="lede">
        O CanvasTools é uma aplicação criada pelo WebTech Network para ajudar professores a organizar a rotina
        acadêmica no Canvas com menos trabalho manual: um painel com o que importa de cada curso, geração de
        questões com IA já prontas para importar, e uma caixa de mensagens mais fácil de acompanhar. Escolha uma
        funcionalidade abaixo para ver como ela funciona.
      </p>

      <TutorialExplorer />
    </main>
  );
}
