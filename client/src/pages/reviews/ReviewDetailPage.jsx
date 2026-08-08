import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import reviewService from '../../api/reviewService';
import { TARGET_TYPE_LABELS } from '../../utils/enums';

const ACTIONS={PENDING:[['Start review','IN_REVIEW']],IN_REVIEW:[['Approve','APPROVED'],['Request changes','CHANGES_REQUESTED'],['Reject','REJECTED']],CHANGES_REQUESTED:[['Resubmit','PENDING']]};
export default function ReviewDetailPage(){
  const {id}=useParams();const navigate=useNavigate();const [review,setReview]=useState();const [error,setError]=useState('');const [comment,setComment]=useState('');const [busy,setBusy]=useState(false);
  const load=useCallback(()=>reviewService.getById(id).then(setReview).catch(e=>setError(e.response?.data?.message||'Could not load review')),[id]);
  useEffect(()=>{load();},[load]);
  const run=async(fn)=>{setBusy(true);setError('');try{await fn();await load();}catch(e){setError(e.response?.data?.message||'Action failed');}finally{setBusy(false);}};
  if(review===undefined)return <Typography>Loading…</Typography>;
  if(review===null)return <Alert severity="warning">Review request not found.</Alert>;
  const targetTitle=review.target?.title||`${TARGET_TYPE_LABELS[review.targetType]} #${review.targetId}`;
  return <Box>
    <AppBreadcrumbs items={[{label:'Dashboard',href:'/'},{label:'Review & Approval',href:'/reviews'},{label:review.title}]}/>
    <PageHeader title={review.title} subtitle={targetTitle} actions={<Button variant="outlined" disabled={!['PENDING','CHANGES_REQUESTED'].includes(review.reviewStatus)} onClick={()=>navigate(`/reviews/${id}/edit`)}>Edit</Button>}/>
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError('')}>{error}</Alert>}
    <Paper variant="outlined" sx={{p:3,mb:3}}><Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center"><StatusChip status={review.reviewStatus}/>{review.publishedAt&&<Chip color="success" label={`Published ${new Date(review.publishedAt).toLocaleDateString()}`}/>}</Stack>
      {review.description&&<Typography>{review.description}</Typography>}
      <Typography variant="body2" color="text.secondary">Submitted by {review.submittedBy||'Compliance Officer'} on {new Date(review.submittedAt||review.createdAt).toLocaleString()}</Typography>
      <Divider/>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {(ACTIONS[review.reviewStatus]||[]).map(([label,status])=><Button key={status} variant={status==='APPROVED'?'contained':'outlined'} color={status==='REJECTED'?'error':status==='CHANGES_REQUESTED'?'warning':'primary'} disabled={busy} onClick={()=>run(()=>reviewService.transition(id,status))}>{label}</Button>)}
        {review.reviewStatus==='APPROVED'&&!review.publishedAt&&<Button variant="contained" color="success" disabled={busy} onClick={()=>run(()=>reviewService.publish(id))}>Publish approved content</Button>}
        {review.reviewStatus!=='ARCHIVED'&&<Button color="error" disabled={busy} onClick={()=>run(()=>reviewService.archive(id))}>Archive</Button>}
      </Stack>
    </Stack></Paper>
    <Stack direction={{xs:'column',md:'row'}} spacing={3}>
      <Card variant="outlined" sx={{flex:1}}><CardContent><Typography variant="h6" sx={{mb:2}}>Review comments</Typography>
        <Stack spacing={1.5}>{review.comments?.length?review.comments.map(c=><Paper key={c.id} variant="outlined" sx={{p:1.5}}><Typography>{c.comment}</Typography><Typography variant="caption" color="text.secondary">{c.author} · {new Date(c.createdAt).toLocaleString()}</Typography></Paper>):<Typography color="text.secondary">No comments yet.</Typography>}</Stack>
        <Stack direction="row" spacing={1} sx={{mt:2}}><TextField fullWidth size="small" label="Add a comment" value={comment} onChange={e=>setComment(e.target.value)} inputProps={{maxLength:2000}}/><Button variant="contained" disabled={busy||!comment.trim()} onClick={()=>run(async()=>{await reviewService.addComment(id,{comment});setComment('');})}>Add</Button></Stack>
      </CardContent></Card>
      <Card variant="outlined" sx={{minWidth:{md:280}}}><CardContent><Typography variant="h6" sx={{mb:2}}>Published versions</Typography>{review.versions?.length?review.versions.map(v=><Box key={v.id} sx={{mb:1}}><Chip label={`Version ${v.version}`} size="small"/> <Typography component="span" variant="caption">{new Date(v.publishedAt).toLocaleString()}</Typography></Box>):<Typography color="text.secondary">No published versions.</Typography>}</CardContent></Card>
    </Stack>
  </Box>;
}
