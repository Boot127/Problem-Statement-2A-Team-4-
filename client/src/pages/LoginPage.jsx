import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Box, Paper, TextField, Button, Typography, Alert, Stack, Avatar } from '@mui/material';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import { useAuth } from '../context/AuthContext';

const loginSchema = Yup.object({
  email: Yup.string().email('Enter a valid email').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

// Dot-grid texture over a diagonal brand-color gradient, built entirely from
// CSS so the login page doesn't depend on any image asset.
const TEXTURED_BACKGROUND = {
  backgroundImage: `
    radial-gradient(circle at 1px 1px, rgba(255,255,255,0.16) 1.5px, transparent 0),
    linear-gradient(150deg, #152a63 0%, #1e3a8a 55%, #0f766e 130%)
  `,
  backgroundSize: '28px 28px, 100% 100%',
};

function Blob({ top, left, right, bottom, size, color }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        filter: 'blur(60px)',
        opacity: 0.55,
        pointerEvents: 'none',
      }}
    />
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState(null);

  const handleSubmit = async ({ email, password }, { setSubmitting }) => {
    setFormError(null);
    try {
      await login(email, password);
      const redirectTo = location.state?.from || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Branding panel — full texture + gradient, hidden on small screens */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          width: '44%',
          position: 'relative',
          overflow: 'hidden',
          px: 8,
          color: '#fff',
          ...TEXTURED_BACKGROUND,
        }}
      >
        <Blob top={-80} left={-80} size={280} color="rgba(59,91,219,0.55)" />
        <Blob bottom={-100} right={-60} size={320} color="rgba(15,118,110,0.55)" />

        <Stack spacing={3} sx={{ position: 'relative', zIndex: 1, maxWidth: 380 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.14)', width: 56, height: 56 }}>
            <GppGoodOutlinedIcon fontSize="large" />
          </Avatar>
          <Typography variant="h3" fontWeight={700}>
            HRCKMP
          </Typography>
          <Typography variant="h6" fontWeight={500} sx={{ opacity: 0.9 }}>
            HR Compliance Knowledge Management Platform
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.75, lineHeight: 1.7 }}>
            One source of truth for statutory benefits, work permits, and compliance content —
            versioned, reviewed, and auditable across every market you operate in.
          </Typography>
        </Stack>
      </Box>

      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          position: 'relative',
          backgroundImage: { xs: TEXTURED_BACKGROUND.backgroundImage, md: 'none' },
          backgroundSize: { xs: TEXTURED_BACKGROUND.backgroundSize, md: 'auto' },
          bgcolor: { xs: 'transparent', md: 'background.default' },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 24px 48px -12px rgba(21,42,99,0.25)',
            backgroundColor: { xs: 'rgba(255,255,255,0.92)', md: 'background.paper' },
            backdropFilter: { xs: 'blur(8px)', md: 'none' },
          }}
        >
          <Avatar
            sx={{
              display: { xs: 'flex', md: 'none' },
              bgcolor: 'primary.main',
              width: 44,
              height: 44,
              mb: 1.5,
            }}
          >
            <GppGoodOutlinedIcon />
          </Avatar>
          <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ mb: 0.5 }}>
            HRCKMP
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to the HR Compliance Knowledge Management Platform.
          </Typography>

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
              <Form noValidate>
                <Stack spacing={2}>
                  {formError && <Alert severity="error">{formError}</Alert>}
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    fullWidth
                    autoFocus
                  />
                  <TextField
                    label="Password"
                    name="password"
                    type="password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    fullWidth
                  />
                  <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
                    {isSubmitting ? 'Signing in…' : 'Sign In'}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        </Paper>
      </Box>
    </Box>
  );
}
