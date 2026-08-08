import { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { reviewValidationSchema } from './reviewValidation';
import { TARGET_TYPES, TARGET_TYPE_LABELS } from '../../utils/enums';
import reviewService from '../../api/reviewService';

function TargetField({ type, value, form, disabled }) {
  const [options,setOptions]=useState([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
  useEffect(()=>{reviewService.targets(type).then(setOptions).catch(()=>setError('Could not load available records')).finally(()=>setLoading(false));},[type]);
  return <TextField select fullWidth label={TARGET_TYPE_LABELS[type]} name="targetId" value={options.some(x=>String(x.id)===String(value))?value:''} onChange={form.handleChange} onBlur={form.handleBlur} disabled={disabled||loading||!options.length} error={form.touched.targetId&&Boolean(form.errors.targetId)} helperText={(form.touched.targetId&&form.errors.targetId)||error||(loading?'Loading records…':options.length?'Select the record being reviewed':'No available records for this type')}>
    {options.map(x=><MenuItem key={x.id} value={x.id}>{x.title}</MenuItem>)}
  </TextField>;
}

export default function ReviewForm({ initialValues,onSubmit,onCancel,submitLabel='Save',isEdit=false }) {
  return <Formik initialValues={initialValues} validationSchema={reviewValidationSchema} enableReinitialize onSubmit={onSubmit}>
    {(form)=><Form noValidate>
      <Paper variant="outlined" sx={{p:3,mb:3}}>
        <Typography variant="h6" sx={{mb:2}}>Review request details</Typography>
        <Stack spacing={2}>
          <TextField fullWidth label="Title" name="title" value={form.values.title} onChange={form.handleChange} onBlur={form.handleBlur} error={form.touched.title&&Boolean(form.errors.title)} helperText={form.touched.title&&form.errors.title}/>
          <TextField fullWidth multiline minRows={3} label="Description" name="description" value={form.values.description} onChange={form.handleChange} onBlur={form.handleBlur} error={form.touched.description&&Boolean(form.errors.description)} helperText={form.touched.description&&form.errors.description}/>
          <Stack direction={{xs:'column',sm:'row'}} spacing={2}>
            <TextField select fullWidth label="Target type" name="targetType" value={form.values.targetType} disabled={isEdit} onChange={(e)=>{form.setFieldValue('targetType',e.target.value);form.setFieldValue('targetId','');}}>
              {TARGET_TYPES.map(x=><MenuItem key={x} value={x}>{TARGET_TYPE_LABELS[x]}</MenuItem>)}
            </TextField>
            <TargetField key={form.values.targetType} type={form.values.targetType} value={form.values.targetId} form={form} disabled={isEdit}/>
          </Stack>
          {isEdit&&<Alert severity="info">Status changes are performed from the review detail page so invalid transitions cannot be skipped.</Alert>}
        </Stack>
      </Paper>
      <Stack direction="row" spacing={2} justifyContent="flex-end"><Button onClick={onCancel} disabled={form.isSubmitting}>Cancel</Button><Button type="submit" variant="contained" disabled={form.isSubmitting}>{submitLabel}</Button></Stack>
    </Form>}
  </Formik>;
}
