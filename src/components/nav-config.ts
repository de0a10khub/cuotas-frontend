import {
  LayoutDashboard,
  Users,
  Receipt,
  AlertTriangle,
  RefreshCcw,
  GitMerge,
  UsersRound,
  Package,
  Settings,
  BarChart3,
  ShieldAlert,
  Briefcase,
  FileText,
  PlugZap,
  History,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
}

export const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, section: 'General' },
  { label: 'Board KPIs', href: '/board2', icon: BarChart3, section: 'General' },

  { label: 'Clientes', href: '/clientes', icon: Users, section: 'Gestión' },
  { label: 'Cobros', href: '/cobros', icon: Receipt, section: 'Gestión' },
  { label: 'Conciliación', href: '/conciliacion', icon: GitMerge, section: 'Gestión' },

  { label: 'Mora', href: '/mora', icon: AlertTriangle, section: 'Mora' },
  { label: 'Mora stats', href: '/mora-stats', icon: BarChart3, section: 'Mora' },
  { label: 'Recobros', href: '/recobros', icon: RefreshCcw, section: 'Mora' },
  { label: 'Registro acciones', href: '/registro-acciones', icon: History, section: 'Mora' },

  { label: 'Datos', href: '/datos', icon: FileText, section: 'Reportes' },
  { label: 'Riesgos', href: '/riesgos', icon: ShieldAlert, section: 'Reportes' },
  { label: 'Operaciones', href: '/operaciones', icon: Briefcase, section: 'Reportes' },

  { label: 'Catálogo', href: '/catalogo', icon: Package, section: 'Admin' },
  { label: 'Empleados', href: '/empleados', icon: UsersRound, section: 'Admin' },
  { label: 'Usuarios', href: '/usuarios', icon: Settings, section: 'Admin' },
  { label: 'Integraciones', href: '/integraciones', icon: PlugZap, section: 'Admin' },
];

export function groupBySection(items: NavItem[]): Record<string, NavItem[]> {
  return items.reduce((acc, item) => {
    const key = item.section || 'Otros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);
}
