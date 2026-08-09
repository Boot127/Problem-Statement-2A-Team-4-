import { Box, Breadcrumbs, Button, Link as MuiLink, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';

// Shared breadcrumb trail. Items accept { label, href?, state?, icon? }.
// Back accepts { label, href, state? } and is deliberately deterministic.
export default function AppBreadcrumbs({ items, back }) {
  return (
    <Box sx={{ mb: 2 }}>
      {back && (
        <Button
          component={RouterLink}
          to={back.href}
          state={back.state}
          size="small"
          startIcon={<ArrowBackOutlinedIcon />}
          aria-label={back.ariaLabel || back.label}
          sx={{ mb: 0.75, px: 0.75, minHeight: 32, fontWeight: 700 }}
        >
          {back.label}
        </Button>
      )}
      <Breadcrumbs
        separator={<NavigateNextIcon sx={{ fontSize: 17, color: 'primary.main', opacity: 0.65 }} />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap', gap: 0.5, rowGap: 0.75 },
          '& .MuiBreadcrumbs-separator': { mx: 0.15 },
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon || (index === 0 && item.href === '/' ? HomeOutlinedIcon : null);
          if (isLast || !item.href) {
            return (
              <Typography
                key={`${item.label}-${index}`}
                color="primary.dark"
                variant="body2"
                fontWeight={800}
                aria-current={isLast ? 'page' : undefined}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  minWidth: 0,
                  maxWidth: '100%',
                  minHeight: 30,
                  px: 1.1,
                  py: 0.35,
                  borderRadius: 1.5,
                  bgcolor: 'action.selected',
                  border: 1,
                  borderColor: 'primary.light',
                  overflowWrap: 'anywhere',
                }}
              >
                {item.label}
              </Typography>
            );
          }
          return (
            <MuiLink
              key={`${item.href}-${item.label}-${index}`}
              component={RouterLink}
              to={item.href}
              state={item.state}
              underline="none"
              color="primary.dark"
              variant="body2"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                minWidth: 0,
                maxWidth: '100%',
                gap: 0.6,
                minHeight: 30,
                px: 1.1,
                py: 0.35,
                borderRadius: 1.5,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                fontWeight: 700,
                transition: (theme) => theme.transitions.create(
                  ['background-color', 'border-color', 'color'],
                  { duration: theme.transitions.duration.shortest }
                ),
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.light',
                  color: 'primary.main',
                },
                '&:focus-visible': {
                  outline: '3px solid',
                  outlineColor: 'primary.light',
                  outlineOffset: 2,
                },
              }}
            >
              {Icon && <Icon aria-hidden="true" sx={{ fontSize: 17 }} />}
              {item.label}
            </MuiLink>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
