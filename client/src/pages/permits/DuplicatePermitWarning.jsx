import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Box, Link, Stack, Typography } from '@mui/material';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import StatusChip from '../../components/common/StatusChip';
import { countryName } from '../../utils/countries';

// Advisory duplicate warning (improvement plan Section 9.6).
//
// Deliberately NOT a validation error: two permits can legitimately share a
// country and type name (for example a permit and its superseded predecessor,
// which is already in this project's seed data). The user is told and given a
// way to open the existing record, then decides for themselves.
export default function DuplicatePermitWarning({ duplicates }) {
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <Alert severity="warning" icon={<ContentCopyOutlinedIcon />} sx={{ mb: 3 }}>
      <AlertTitle>
        {duplicates.length === 1
          ? 'A similar permit already exists'
          : `${duplicates.length} similar permits already exist`}
      </AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        These records share the same country and permit type. Open one to check before creating a
        duplicate — or continue if this is genuinely a different permit.
      </Typography>
      <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
        {duplicates.map((permit) => (
          <Box component="li" key={permit.id}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
            >
              <Link
                component={RouterLink}
                to={`/permits/${permit.id}`}
                target="_blank"
                rel="noopener"
                fontWeight={600}
              >
                {permit.title}
              </Link>
              <Typography variant="caption" color="text.secondary">
                {countryName(permit.countryCode)} · {permit.permitType}
              </Typography>
              <StatusChip status={permit.status} />
            </Stack>
          </Box>
        ))}
      </Stack>
    </Alert>
  );
}
