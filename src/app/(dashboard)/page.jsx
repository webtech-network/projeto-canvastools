import Link from 'next/link';
import WebTechFooter from '@/components/WebTechFooter';

const FEATURES_PRONTAS = [
  'Login com Canvas via OAuth2 — sem senha ou token compartilhado com o app.',
  'Painel de cursos com favoritos, indicador de avaliações pendentes e status (publicado / não publicado / encerrado).',
  'Lista de atividades por curso, com atalho direto para importar questões nos quizzes clássicos.',
  'Importação em lote de questões via arquivo .json, com validação estrutural e avisos de formatação não bloqueantes.',
  'Geração de questões no padrão ENADE com IA (OpenAI), a partir de tema, quantidade, complexidade e tipo, com prévia antes de salvar.',
  'CLI para importação direta via linha de comando, para quem prefere não depender do navegador.',
];

const FEATURES_FUTURAS = [
  'Suporte a outros provedores de IA (Claude, Gemini) na geração de questões, além da OpenAI.',
  'Importação direta das questões geradas por IA, sem precisar baixar e reenviar o arquivo .json.',
  'Histórico de questões geradas e de importações realizadas por curso/disciplina.',
  'Suporte a New Quizzes (LTI) do Canvas — hoje a importação só funciona em quizzes clássicos.',
  'Banco de questões reutilizável entre turmas e semestres.',
  'Estatísticas de desempenho por questão após a aplicação do quiz.',
];

export default function HomePage() {
  return (
    <main className="page">
      <h1>CanvasTools</h1>
      <p className="cover-tagline">
        Importe questões em lote para os quizzes do Canvas e gere novas questões com IA — tudo em um só painel,
        pensado para professores prepararem avaliações com menos trabalho manual.
      </p>
      <Link href="/courses" className="btn btn-primary btn-lg">
        Acessar Painel de Cursos
      </Link>

      <div className="cover-features-inner">
        <div className="cover-feature-group">
          <h2>O que a ferramenta já faz</h2>
          <ul>
            {FEATURES_PRONTAS.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
        <div className="cover-feature-group">
          <h2>Ideias para o que vem a seguir</h2>
          <p className="lede">Funcionalidades ainda não implementadas, mas que fazem sentido para o projeto evoluir.</p>
          <ul>
            {FEATURES_FUTURAS.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>

      <WebTechFooter />
    </main>
  );
}
