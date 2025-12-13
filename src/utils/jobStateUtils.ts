const JOB_STATE_TEXT: Record<string, string> = {
  'Posted': 'Mở',
  'PendingApproval': 'Chờ duyệt',
  'InProgress': 'Đang thực hiện',
  'Completed': 'Hoàn thành',
  'Disputed': 'Đang tranh chấp',
  'Cancelled': 'Đã hủy',
  'CancelledByPoster': 'Đã hủy bởi người thuê',
};

const JOB_STATE_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default' | 'expired' | 'pending' | 'active' | 'completed' | 'disputed' | 'cancelled'> = {
  'Posted': 'active',
  'PendingApproval': 'pending',
  'InProgress': 'info',
  'Completed': 'completed',
  'Disputed': 'disputed',
  'Cancelled': 'cancelled',
  'CancelledByPoster': 'cancelled',
};

export const getJobStateDisplay = (
  state: unknown, 
  applyDeadline?: number, 
  hasFreelancer?: boolean,
  disputeResolved?: any
): { text: string; variant: 'success' | 'error' | 'warning' | 'info' | 'default' | 'expired' | 'pending' | 'active' | 'completed' | 'disputed' | 'cancelled' } => {
  const stateStr = typeof state === 'string' ? state : 'Active';
  
  if (disputeResolved) {
    return { text: 'Tranh chấp đã xử lý', variant: 'disputed' };
  }
  
  const applyDeadlineExpired = applyDeadline
    ? applyDeadline * 1000 < Date.now() 
    : false;
  const isExpiredPosted = stateStr === 'Posted' && applyDeadlineExpired && !hasFreelancer;
  
  if (isExpiredPosted) {
    return { text: 'Hết hạn đăng ký', variant: 'expired' };
  }
  
  const text = JOB_STATE_TEXT[stateStr] || stateStr || 'Hoạt động';
  const variant = JOB_STATE_VARIANT[stateStr] || 'default';
  
  return { text, variant };
};




