import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  RefreshCcw,
  GitMerge,
  UsersRound,
  Package,
  BarChart3,
  ShieldAlert,
  Briefcase,
  FileText,
  PlugZap,
  History,
  PhoneCall,
  Scale,
  Sparkles,
  Activity,
  Webhook,
  GraduationCap,
  Headphones,
  Bell,
  Zap,
  User,
  GitMerge as MergeIcon,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
}

export const navigation: NavItem[] = [
  { label: 'Mis Casos', href: '/mis-casos', icon: User, section: 'Personal' },
  { label: 'Casos por Operario', href: '/casos-por-operario', icon: UsersRound, section: 'Personal' },

  { label: 'Inicio', href: '/', icon: LayoutDashboard, section: 'General' },
  { label: 'Board KPIs', href: '/board2', icon: BarChart3, section: 'General' },
  { label: 'Notificaciones', href: '/notificaciones', icon: Bell, section: 'General' },

  { label: 'Clientes', href: '/clientes', icon: Users, section: 'Gestión' },
  { label: 'Call Full Pay', href: '/full-pay', icon: PhoneCall, section: 'Gestión' },
  { label: 'Mentorías', href: '/mentorias', icon: GraduationCap, section: 'Gestión' },

  { label: 'Duplicados', href: '/admin/duplicados', icon: MergeIcon, section: 'Admin Datos' },

  { label: 'Mora N1', href: '/mora', icon: AlertTriangle, section: 'Mora' },
  { label: 'Mora N2', href: '/mora-n2', icon: ShieldAlert, section: 'Mora' },
  { label: 'Mora stats', href: '/mora-stats', icon: BarChart3, section: 'Mora' },
  { label: 'Recobrame', href: '/recobros', icon: RefreshCcw, section: 'Mora' },
  { label: 'Registro acciones', href: '/registro-acciones', icon: History, section: 'Mora' },

  { label: 'Datos', href: '/datos', icon: FileText, section: 'Reportes' },
  { label: 'Disputas', href: '/disputas', icon: Scale, section: 'Reportes' },
  { label: 'Operaciones', href: '/operaciones', icon: Briefcase, section: 'Reportes' },

  { label: 'Catálogo', href: '/catalogo', icon: Package, section: 'Admin' },
  { label: 'Empleados', href: '/empleados', icon: UsersRound, section: 'Admin' },
  { label: 'Integraciones', href: '/integraciones', icon: PlugZap, section: 'Admin' },
  { label: 'LOG Operaciones', href: '/log', icon: Activity, section: 'Admin' },
  { label: 'Seguridad', href: '/admin/seguridad', icon: ShieldAlert, section: 'Admin' },
  { label: 'Webhooks', href: '/webhooks', icon: Webhook, section: 'Admin' },
  { label: 'MODO DIOS', href: '/admin/god-mode', icon: Zap, section: 'Admin' },
];

export function groupBySection(items: NavItem[]): Record<string, NavItem[]> {
  return items.reduce((acc, item) => {
    const key = item.section || 'Otros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);
}
