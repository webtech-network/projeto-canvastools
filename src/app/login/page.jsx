import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getSession, isSessionValid } from '@/lib/session';
import WebTechFooter from '@/components/WebTechFooter';
import banner from '@/assets/images/banner_og.jpeg';

const ERROR_MESSAGES = {
  state_invalido: 'Não foi possível validar o retorno do Canvas (state inválido). Tente novamente.',
  oauth_falhou: 'Falha ao concluir a autenticação com o Canvas. Tente novamente.',
};

export default async function LoginPage({ searchParams }) {
  const session = await getSession();
  if (isSessionValid(session)) {
    redirect('/');
  }

  const { error } = (await searchParams) || {};

  return (
    <main className="login-page">
      <div className="login-page-content">
        <Image src={banner} alt="CanvasTools" className="login-hero-banner" priority />
        <h1>Bem-vindo(a) ao CanvasTools</h1>
        <p>
          Um ambiente criado pelo WebTech Network para organizar e agilizar o trabalho de professores e alunos
          potencializando o processo de ensino e aprendizagem.
        </p>
        {error && (
          <div className="alert alert-error" style={{ textAlign: 'left' }}>
            {ERROR_MESSAGES[error] || 'Ocorreu um erro ao entrar com o Canvas.'}
          </div>
        )}
        <a className="btn btn-primary btn-lg" href="/api/auth/login">
          Entrar com Canvas
        </a>
      </div>
      <WebTechFooter variant="bar" />
    </main>
  );
}
