import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Box, Paper, TextField, Button, Typography, Alert, Stack } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const loginSchema = Yup.object({
  email: Yup.string().email('Enter a valid email').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 400 }}>
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
  );
}
