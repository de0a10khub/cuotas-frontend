import {
  LayoutDashboard,
  Users,
  Receipt,
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
  LayoutGrid,
  Kanban,
  Contact,
  CheckSquare,
  Calendar,
  Bell,
  ScrollText,
  Settings,
  GitMerge as MergeIcon,
  AlertOctagon,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
}

export const navigation: NavItem[] = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard, section: 'General' },
  { label: 'Board KPIs', href: '/board2', icon: BarChart3, section: 'General' },

  { label: 'Clientes', href: '/clientes', icon: Users, section: 'Gestión' },
  { label: 'Cobros', href: '/cobros', icon: Receipt, section: 'Gestión' },
  { label: 'Conciliación', href: '/conciliacion', icon: GitMerge, section: 'Gestión' },
  { label: 'Call Full Pay', href: '/full-pay', icon: PhoneCall, section: 'Gestión' },
  { label: 'Mentorías', href: '/mentorias', icon: GraduationCap, section: 'Gestión' },
  { label: 'Closers', href: '/closers', icon: Headphones, section: 'Gestión' },

  { label: 'CRM', href: '/crm', icon: LayoutGrid, section: 'CRM' },
  { label: 'Pipeline', href: '/crm/pipeline', icon: Kanban, section: 'CRM' },
  { label: 'Contactos', href: '/crm/contacts', icon: Contact, section: 'CRM' },
  { label: 'Tareas', href: '/crm/tasks', icon: CheckSquare, section: 'CRM' },
  { label: 'Reuniones', href: '/crm/meetings', icon: Calendar, section: 'CRM' },
  { label: 'Notificaciones', href: '/crm/notifications', icon: Bell, section: 'CRM' },
  { label: 'Calendly Logs', href: '/crm/calendly-logs', icon: History, section: 'CRM' },
  { label: 'Activity Log', href: '/crm/activity-log', icon: ScrollText, section: 'CRM' },
  { label: 'Admin CRM', href: '/crm/admin', icon: Settings, section: 'CRM' },

  { label: 'Duplicados', href: '/admin/duplicados', icon: MergeIcon, section: 'Admin Datos' },
  { label: 'Discrepancias', href: '/admin/discrepancias', icon: AlertOctagon, section: 'Admin Datos' },

  { label: 'Mora', href: '/mora', icon: AlertTriangle, section: 'Mora' },
  { label: 'Mora stats', href: '/mora-stats', icon: BarChart3, section: 'Mora' },
  { label: 'Recobros', href: '/recobros', icon: RefreshCcw, section: 'Mora' },
  { label: 'Registro acciones', href: '/registro-acciones', icon: History, section: 'Mora' },

  { label: 'Datos', href: '/datos', icon: FileText, section: 'Reportes' },
  { label: 'Disputas', href: '/disputas', icon: Scale, section: 'Reportes' },
  { label: 'Refinanciación', href: '/refinanciacion', icon: Sparkles, section: 'Reportes' },
  { label: 'Riesgos', href: '/riesgos', icon: ShieldAlert, section: 'Reportes' },
  { label: 'Operaciones', href: '/operaciones', icon: Briefcase, section: 'Reportes' },
  { label: 'Proyecciones', href: '/proyecciones', icon: BarChart3, section: 'Reportes' },

  { label: 'Catálogo', href: '/catalogo', icon: Package, section: 'Admin' },
  { label: 'Empleados', href: '/empleados', icon: UsersRound, section: 'Admin' },
  { label: 'Integraciones', href: '/integraciones', icon: PlugZap, section: 'Admin' },
  { label: 'LOG Operaciones', href: '/log', icon: Activity, section: 'Admin' },
  { label: 'Webhooks', href: '/webhooks', icon: Webhook, section: 'Admin' },
];

export function groupBySection(items: NavItem[]): Record<string, NavItem[]> {
  return items.reduce((acc, item) => {
    const key = item.section || 'Otros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);
}
