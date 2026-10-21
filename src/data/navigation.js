import { LayoutDashboard, ListChecks, PlusCircle, Settings } from 'lucide-react'

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
    subtitle: 'A full list will live here in a later stage.',
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
    subtitle: 'Local preferences will be stored in this browser.',
  },
]
