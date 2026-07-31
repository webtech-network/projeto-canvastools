'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LayoutDashboard, GraduationCap, Mail, MessageSquareText, UserRound, KeyRound, Link2 } from 'lucide-react';
import imgDashboard from '@/assets/images/tutorial/tela_dashboard.png';
import imgCursos from '@/assets/images/tutorial/tela_painel_cursos.png';
import imgMensagens from '@/assets/images/tutorial/tela_painel_mensagens.png';
import imgMensagemAberta from '@/assets/images/tutorial/tela_mensagem_aberta.png';
import imgPerfil from '@/assets/images/tutorial/tela_perfil.png';
import imgMotoresIa from '@/assets/images/tutorial/tela_perfil_motores_ia.png';
import imgAtalhos from '@/assets/images/tutorial/tela_perfil_atalhos.png';

const FEATURES = [
  {
    id: 'dashboard',
    label: 'Painel inicial',
    Icon: LayoutDashboard,
    image: imgDashboard,
    howTo:
      'É a primeira tela que você vê depois de entrar. Para voltar a ela a qualquer momento, clique na logo do CanvasTools no topo da barra lateral.',
    about:
      'Reúne um resumo dos seus cursos favoritos: número de disciplinas ativas, total de alunos, mensagens pendentes e pendências de correção, além de um calendário de prazos de entrega e uma lista com os prazos mais recentes (passados e futuros). Os dados ficam guardados no navegador para abrir rápido e são atualizados em segundo plano.',
  },
  {
    id: 'cursos',
    label: 'Painel de Cursos',
    Icon: GraduationCap,
    image: imgCursos,
    howTo: 'Clique em "Cursos" na barra lateral.',
    about:
      'Lista os cursos em que você é professor no Canvas, com busca por nome ou código, filtros por favorito e por status de publicação, e ordenação por qualquer coluna. Cada linha tem atalhos para favoritar o curso, ver as atividades e ver as mensagens daquele curso.',
  },
  {
    id: 'mensagens',
    label: 'Mensagens',
    Icon: Mail,
    image: imgMensagens,
    howTo: 'Clique em "Mensagens" na barra lateral.',
    about:
      'Mostra a caixa de entrada do Canvas dos seus cursos favoritos, agrupada por curso. Dá para expandir ou recolher todos os grupos de uma vez e filtrar por um curso específico no seletor no topo.',
  },
  {
    id: 'mensagem-aberta',
    label: 'Abrir uma mensagem',
    Icon: MessageSquareText,
    image: imgMensagemAberta,
    howTo:
      'Dentro de Mensagens, clique no assunto de qualquer mensagem (ou na seta no início da linha) para expandi-la.',
    about:
      'Mostra a conversa completa, com botões para abrir a mensagem no Canvas, arquivá-la, e — se você tiver uma chave de IA cadastrada no perfil — pedir uma sugestão de resposta gerada automaticamente, que pode ser copiada com um clique.',
  },
  {
    id: 'perfil',
    label: 'Perfil',
    Icon: UserRound,
    image: imgPerfil,
    howTo: 'Clique no seu nome, no canto superior direito da barra superior.',
    about:
      'Mostra seus dados de conta (nome e instituição do Canvas) e reúne as demais configurações pessoais do CanvasTools, como as chaves de IA e os atalhos pessoais.',
  },
  {
    id: 'motores-ia',
    label: 'Motores de IA',
    Icon: KeyRound,
    image: imgMotoresIa,
    howTo: 'Na tela de Perfil, na seção "Motores de IA".',
    about:
      'Cadastre sua própria chave de API para cada provedor (OpenAI, Google Gemini ou Anthropic Claude) — cada uma é validada e salva separadamente, e pode ser trocada ou removida quando quiser. É essa chave que alimenta a geração de questões e a sugestão de resposta a mensagens.',
  },
  {
    id: 'atalhos',
    label: 'Atalhos pessoais',
    Icon: Link2,
    image: imgAtalhos,
    howTo: 'Na tela de Perfil, na seção "Atalhos pessoais".',
    about:
      'Cadastre links de acesso rápido que aparecem no Painel inicial. Ficam salvos só neste navegador — para levá-los a outro navegador ou computador, use os botões de exportar e importar.',
  },
];

export default function TutorialExplorer() {
  const [activeId, setActiveId] = useState(FEATURES[0].id);
  const active = FEATURES.find((f) => f.id === activeId);

  return (
    <div className="tutorial-layout">
      <ul className="tutorial-list" role="tablist" aria-label="Funcionalidades">
        {FEATURES.map(({ id, label, Icon }) => (
          <li key={id}>
            <button
              type="button"
              role="tab"
              aria-selected={id === activeId}
              className={`tutorial-list-btn${id === activeId ? ' active' : ''}`}
              onClick={() => setActiveId(id)}
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </button>
          </li>
        ))}
      </ul>

      <div className="tutorial-detail" role="tabpanel">
        <h2>{active.label}</h2>

        <div className="tutorial-screenshot">
          <Image src={active.image} alt={`Tela de ${active.label}`} />
        </div>

        <div className="tutorial-detail-section">
          <h3>Como chegar</h3>
          <p>{active.howTo}</p>
        </div>
        <div className="tutorial-detail-section">
          <h3>Como funciona</h3>
          <p>{active.about}</p>
        </div>
      </div>
    </div>
  );
}
