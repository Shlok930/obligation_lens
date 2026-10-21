import { CalendarRange, Compass, FileSearch2, GitBranch, LayoutDashboard, ListChecks, MessageCircleQuestion, PlusCircle, Settings } from 'lucide-react'

export const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    title: 'Overview',
    subtitle: 'A focused view of what still needs your attention.',
  },
  {
    id: 'obligations',
    label: 'My Obligations',
    icon: ListChecks,
    title: 'My Obligations',
    subtitle: 'All your saved commitments in one place.',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: CalendarRange,
    title: 'Obligation Timeline',
    subtitle: 'Every deadline and action, mapped out chronologically.',
  },
  {
    id: 'explorer',
    label: 'Obligation Explorer',
    icon: Compass,
    title: 'Obligation Explorer',
    subtitle: 'Understand recorded responsibilities, evidence, and what-if scenarios.',
  },
  {
    id: 'documents',
    label: 'Document Intelligence',
    icon: FileSearch2,
    title: 'Document Intelligence',
    subtitle: 'Review source-backed dates, actions, and amounts before saving.',
  },
  {
    id: 'dependencies',
    label: 'Dependencies',
    icon: GitBranch,
    title: 'Dependency Graph',
    subtitle: 'Map prerequisites, blockers, and connected actions.',
  },
  {
    id: 'ask',
    label: 'Ask Your Obligations',
    icon: MessageCircleQuestion,
    title: 'Ask Your Obligations',
    subtitle: 'Get evidence-backed answers from your saved records.',
  },
  {
    id: 'add',
    label: 'Add Commitment',
    icon: PlusCircle,
    title: 'Add Commitment',
    subtitle: 'Capture a purchase, booking, or subscription.',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    title: 'Settings',
    subtitle: 'Manage local records and backups for this browser.',
  },
]
