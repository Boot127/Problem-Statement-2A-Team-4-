import { Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

// Shared breadcrumb trail. `items` is an array of { label, href? } — the last
// item (or any item without an href) renders as plain text.
export default function AppBreadcrumbs({ items }) {
  return (
    <Breadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{ mb: 2 }}
      aria-label="breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        if (isLast || !item.href) {
          return (
            <Typography key={item.label} color="text.primary" variant="body2" fontWeight={600}>
              {item.label}
            </Typography>
          );
        }
        return (
          <MuiLink
            key={item.label}
            component={RouterLink}
            to={item.href}
            underline="hover"
            color="inherit"
            variant="body2"
          >
            {item.label}
          </MuiLink>
        );
      })}
    </Breadcrumbs>
  );
}
