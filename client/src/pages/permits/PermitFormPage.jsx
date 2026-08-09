import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Alert, Button, Skeleton, Stack } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import PermitForm from './PermitForm';
import DuplicatePermitWarning from './DuplicatePermitWarning';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { emptyPermit } from './permitValidation';
import {
  getPermitNavigation,
  permitBreadcrumbItems,
  permitNavigationState,
} from './permitNavigation';

export default function PermitFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id);
  const navigation = getPermitNavigation(location);
  const navigationState = permitNavigationState(location);
  const [initialValues, setInitialValues] = useState(isEdit ? null : emptyPermit);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  // Duplicate detection (improvement plan 9.6).
  //
  // `typedIdentity` is whatever the user last entered; it falls back to the
  // loaded permit so an edit that never touches country/type still surfaces a
  // pre-existing collision. Deriving the pair rather than syncing it in an
  // effect keeps this off the render-cascade path.
  const [typedIdentity, setTypedIdentity] = useState(null);
  const [dupResult, setDupResult] = useState({ key: '', items: [] });

  // Must not set state synchronously — it is called from an effect on mount.
  const load = () =>
    permitService
      .getById(id)
      .then((permit) => {
        if (!permit) {
          setNotFound(true);
          return;
        }
        // GET /permits/:id also returns nested steps/documents and a derived
        // health block. Steps/documents are managed on the detail page, and
        // health is computed server-side, so none of them belong in the form.
        const permitFields = { ...permit };
        delete permitFields.steps;
        delete permitFields.documents;
        delete permitFields.health;
        // Nullable columns come back as null, but MUI inputs must stay
        // controlled — coerce null/undefined to '' so React doesn't warn.
        Object.keys(permitFields).forEach((key) => {
          if (permitFields[key] === null || permitFields[key] === undefined) {
            permitFields[key] = '';
          }
        });
        setInitialValues({ ...emptyPermit, ...permitFields });
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
        setLoadFailed(true);
      });

  // Retry clears the previous failure before re-fetching.
  const retryLoad = () => {
    setLoadFailed(false);
    setError('');
    return load();
  };

  useEffect(() => {
    if (!isEdit) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const dupCountry = (typedIdentity?.countryCode ?? initialValues?.countryCode ?? '').trim();
  const dupPermitType = (typedIdentity?.permitType ?? initialValues?.permitType ?? '').trim();
  const dupKey = `${dupCountry}|${dupPermitType}`;

  useEffect(() => {
    if (!dupCountry || !dupPermitType) return undefined;

    // Debounced so typing a permit type doesn't fire a request per keystroke.
    const timer = setTimeout(() => {
      permitService
        .checkDuplicates({
          countryCode: dupCountry,
          permitType: dupPermitType,
          excludeId: isEdit ? id : undefined,
        })
        // Results are stamped with the pair they belong to, so a slow response
        // for an older pair can never be shown against a newer one.
        .then((items) => setDupResult({ key: dupKey, items }))
        // A failed duplicate check must never block the form — it is advisory,
        // so a failure degrades to "no warning shown".
        .catch(() => setDupResult({ key: dupKey, items: [] }));
    }, 400);

    return () => clearTimeout(timer);
  }, [dupCountry, dupPermitType, dupKey, isEdit, id]);

  // Derived rather than stored: clearing the country or type hides the warning
  // immediately instead of waiting for the next request to resolve.
  const duplicates = dupResult.key === dupKey ? dupResult.items : [];

  // setSubmitting is only cleared on failure; on success we navigate away, so
  // leaving it set keeps the buttons disabled and blocks a double submit.
  const handleSubmit = (values, { setSubmitting }) => {
    setError('');
    const action = isEdit ? permitService.update(id, values) : permitService.create(values);
    action
      .then((permit) => {
        navigate(`/permits/${permit.id}`, { state: navigationState });
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
        setSubmitting(false);
      });
  };

  if (notFound) {
    return (
      <Box>
        <AppBreadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Work Permits', href: navigation.listHref },
            { label: 'Not Found' },
          ]}
          back={{ label: 'Back to Work Permits', href: navigation.listHref }}
        />
        <Typography variant="h6" sx={{ mb: 2 }}>
          Work permit not found.
        </Typography>
      </Box>
    );
  }

  // Load failed before we ever had form values — show the error instead of an
  // indefinite loading state.
  if (loadFailed && !initialValues) {
    return (
      <Box>
        <AppBreadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Work Permits', href: navigation.listHref },
            { label: 'Error' },
          ]}
          back={{ label: 'Back to Work Permits', href: navigation.listHref }}
        />
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={retryLoad}>
              Retry
            </Button>
          }
        >
          {error || 'Could not load this work permit.'}
        </Alert>
      </Box>
    );
  }

  if (!initialValues) {
    return (
      <Box>
        <Skeleton variant="text" width={220} height={24} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="40%" height={44} sx={{ mb: 3 }} />
        <Stack spacing={3}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={180} />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <AppBreadcrumbs
        items={isEdit
          ? permitBreadcrumbItems(initialValues, location, 'Edit')
          : [
              { label: 'Dashboard', href: '/' },
              { label: 'Work Permits', href: navigation.listHref },
              { label: 'Create Permit' },
            ]}
        back={isEdit
          ? { label: `Back to ${initialValues.title}`, href: `/permits/${id}`, state: navigationState }
          : { label: 'Back to Work Permits', href: navigation.listHref }}
      />
      <PageHeader
        title={isEdit ? 'Edit Work Permit' : 'New Work Permit'}
        subtitle={
          isEdit
            ? 'Update the details of this permit type.'
            : 'Create a new work-permit type for a country.'
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <PermitForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => navigate(isEdit ? `/permits/${id}` : navigation.listHref, {
          state: isEdit ? navigationState : undefined,
        })}
        submitLabel={isEdit ? 'Save Changes' : 'Create Permit'}
        onIdentityChange={setTypedIdentity}
        banner={<DuplicatePermitWarning duplicates={duplicates} />}
      />
    </Box>
  );
}
