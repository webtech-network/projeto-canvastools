import { GraduationCap, Sparkles, Mail, Settings, Landmark } from 'lucide-react';
import { getSession, isSessionValid } from '@/lib/session';
import WebTechFooter from '@/components/WebTechFooter';

export default async function SobrePage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null; // proxy already redirects unauthenticated requests to /login
  }

  return (
    <main className="page">
      <h1>Sobre o CanvasTools</h1>
      <p className="lede cover-tagline">
        Um painel único para professores acompanharem cursos, mensagens, correções e questões do Canvas — com apoio
        de IA em cada etapa, usando a própria chave de API de cada usuário.
      </p>

      <div className="cover-features-inner">
        <div className="cover-feature-group">
          <h3>
            <GraduationCap size={18} strokeWidth={1.8} className="cover-feature-icon" aria-hidden="true" />
            Cursos e atividades
          </h3>
          <ul>
            <li>
              Painel de cursos com favoritos, filtros e busca, trazendo status de publicação, pendências de correção
              e mensagens de cada disciplina direto do Canvas.
            </li>
            <li>Lista de atividades por curso, com atalho para corrigir com rubrica ou importar questões nos quizzes clássicos.</li>
            <li>
              Correção por rubrica: uma tabela com todos os alunos, nota por critério e envio em lote — populando o
              recurso de rubrica do próprio Canvas, não só um comentário de texto.
            </li>
          </ul>
        </div>

        <div className="cover-feature-group">
          <h3>
            <Sparkles size={18} strokeWidth={1.8} className="cover-feature-icon" aria-hidden="true" />
            Questões e IA
          </h3>
          <ul>
            <li>
              Geração de questões no padrão ENADE com IA (OpenAI, Google Gemini ou Anthropic Claude), prontas para
              revisar e importar.
            </li>
            <li>Alternativa sem chave de API: baixe a skill do CanvasTools para gerar questões pelo Claude Desktop.</li>
            <li>Importação de arquivos .json de questões já prontos, com validação e pré-visualização antes de enviar ao Canvas.</li>
            <li>Prompts de IA personalizáveis por funcionalidade — complemente ou substitua o prompt padrão de cada uma.</li>
          </ul>
        </div>

        <div className="cover-feature-group">
          <h3>
            <Mail size={18} strokeWidth={1.8} className="cover-feature-icon" aria-hidden="true" />
            Mensagens
          </h3>
          <ul>
            <li>Caixa de entrada do Canvas agrupada por curso, com listagem de alunos e composição de novas mensagens.</li>
            <li>Sugestão de resposta e melhoria de texto com IA antes de enviar.</li>
          </ul>
        </div>

        <div className="cover-feature-group">
          <h3>
            <Settings size={18} strokeWidth={1.8} className="cover-feature-icon" aria-hidden="true" />
            Configurações e conexões
          </h3>
          <ul>
            <li>Atalhos personalizados exibidos no painel inicial.</li>
            <li>Conexão com GitHub e com Google Drive, salva neste navegador.</li>
            <li>
              Salvar/carregar as configurações (atalhos, prompts e modelos de IA escolhidos) em um arquivo local ou
              no Google Drive, para levá-las a outro computador.
            </li>
            <li>Tutorial interativo com um resumo visual de cada tela do CanvasTools.</li>
          </ul>
        </div>
      </div>

      <section className="about-webtech">
        <h2>
          <Landmark size={20} strokeWidth={1.8} className="cover-feature-icon" aria-hidden="true" />
          Um projeto de extensão da PUC Minas
        </h2>
        <p className="lede">
          O CanvasTools é desenvolvido pelo{' '}
          <a href="https://webtech.network/" target="_blank" rel="noopener noreferrer">
            WebTech Network
          </a>
          , projeto de extensão da PUC Minas voltado à criação de soluções tecnológicas que apoiam a comunidade
          acadêmica — unindo alunos e professores no desenvolvimento de ferramentas reais para o dia a dia do ensino
          e da aprendizagem.
        </p>
      </section>

      <WebTechFooter />
    </main>
  );
}
