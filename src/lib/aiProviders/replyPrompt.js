// Separate from shared.js on purpose — that file is quiz-generation-specific
// (SYSTEM_PROMPT, buildQuizOutputSchema); this is a different capability
// (free-text reply suggestion, no JSON schema involved) shared the same way
// across the three provider adapters.
export const REPLY_SYSTEM_PROMPT = `Você é um assistente que ajuda um professor a responder mensagens recebidas na caixa de entrada do Canvas LMS.

Escreva uma sugestão de resposta em português, em tom profissional e cordial, direta e objetiva, considerando o assunto, o remetente e o conteúdo da mensagem recebida. Não invente informações que não estejam na mensagem original ou nas informações adicionais fornecidas pelo professor.

Se o professor fornecer informações adicionais (contexto, decisão a comunicar, dados específicos), priorize-as e incorpore-as diretamente na resposta — elas existem justamente para preencher o que a mensagem original não permite inferir sozinha.

Responda apenas com o texto da resposta sugerida — sem saudação de abertura tipo "Aqui está a sugestão:", sem markdown, sem aspas envolvendo o texto.`;

export function buildReplyUserMessage({ subject, sender, message, guidance }) {
  const base = `Assunto: ${subject || '(sem assunto)'}\nRemetente: ${sender || 'desconhecido'}\n\nMensagem recebida:\n${message}`;
  if (!guidance || !guidance.trim()) return base;
  return `${base}\n\nInformações adicionais fornecidas pelo professor para orientar a resposta:\n${guidance.trim()}`;
}
