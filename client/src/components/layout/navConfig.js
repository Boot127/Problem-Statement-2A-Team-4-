import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

// Sidebar navigation for the platform shell. "Work Permits" (Developer 2) and
// "Review & Approval" (Developer 3) point at fully implemented features; the
// rest render placeholder pages until their owning developer builds them out.
export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: DashboardOutlinedIcon },
  { label: 'Compliance Content', path: '/content', icon: ArticleOutlinedIcon },
  { label: 'Work Permits', path: '/permits', icon: AssignmentIndOutlinedIcon },
  { label: 'Review & Approval', path: '/reviews', icon: FactCheckOutlinedIcon },
  { label: 'Legal Updates', path: '/updates', icon: CampaignOutlinedIcon },
  { label: 'Search', path: '/search', icon: SearchOutlinedIcon },
  { label: 'Administration', path: '/admin', icon: AdminPanelSettingsOutlinedIcon, roles: ['admin'] },
];
