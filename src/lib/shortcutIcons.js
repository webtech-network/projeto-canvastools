import {
  Link2,
  Globe,
  Star,
  BookOpen,
  FileText,
  Video,
  Mail,
  Calendar,
  GraduationCap,
  MessageSquare,
  Folder,
  Cloud,
  Database,
  Code,
  Bell,
  Settings,
  Home,
  Briefcase,
  Newspaper,
  Presentation,
  Table,
  ClipboardList,
} from 'lucide-react';

// Curated subset of the app's existing icon library (lucide-react, no new
// dependency) offered when creating/editing a dashboard shortcut — the full
// ~1500-icon set would be unusable as a picker, so this sticks to icons that
// plausibly describe an arbitrary external link.
export const SHORTCUT_ICONS = [
  { id: 'link', label: 'Link', Icon: Link2 },
  { id: 'globe', label: 'Site', Icon: Globe },
  { id: 'star', label: 'Destaque', Icon: Star },
  { id: 'book', label: 'Material', Icon: BookOpen },
  { id: 'file', label: 'Documento', Icon: FileText },
  { id: 'video', label: 'Vídeo', Icon: Video },
  { id: 'mail', label: 'E-mail', Icon: Mail },
  { id: 'calendar', label: 'Calendário', Icon: Calendar },
  { id: 'graduation', label: 'Ensino', Icon: GraduationCap },
  { id: 'chat', label: 'Mensagens', Icon: MessageSquare },
  { id: 'folder', label: 'Pasta', Icon: Folder },
  { id: 'cloud', label: 'Nuvem', Icon: Cloud },
  { id: 'database', label: 'Dados', Icon: Database },
  { id: 'code', label: 'Código', Icon: Code },
  { id: 'bell', label: 'Aviso', Icon: Bell },
  { id: 'settings', label: 'Configuração', Icon: Settings },
  { id: 'home', label: 'Início', Icon: Home },
  { id: 'briefcase', label: 'Trabalho', Icon: Briefcase },
  { id: 'news', label: 'Notícias', Icon: Newspaper },
  { id: 'presentation', label: 'Apresentação', Icon: Presentation },
  { id: 'table', label: 'Planilha', Icon: Table },
  { id: 'checklist', label: 'Lista', Icon: ClipboardList },
];

export const DEFAULT_SHORTCUT_ICON_ID = 'link';

const ICON_BY_ID = new Map(SHORTCUT_ICONS.map((i) => [i.id, i.Icon]));

export function getShortcutIcon(iconId) {
  return ICON_BY_ID.get(iconId) || ICON_BY_ID.get(DEFAULT_SHORTCUT_ICON_ID);
}
