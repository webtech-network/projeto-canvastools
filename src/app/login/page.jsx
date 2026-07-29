import { redirect } from 'next/navigation';
import { getSession, isSessionValid } from '@/lib/session';
import WebTechFooter from '@/components/WebTechFooter';

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
      <div className="login-card">
        <h1>CanvasTools</h1>
        <p>Importe questões em lote para os quizzes das suas disciplinas no Canvas.</p>
        {error && (
          <div className="alert alert-error" style={{ textAlign: 'left' }}>
            {ERROR_MESSAGES[error] || 'Ocorreu um erro ao entrar com o Canvas.'}
          </div>
        )}
        <a className="btn btn-primary" href="/api/auth/login">
          Entrar com Canvas
        </a>
      </div>
      <WebTechFooter />
    </main>
  );
}
