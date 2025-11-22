export const getJobStateDisplay = (
  state: unknown, 
  applyDeadline?: number, 
  hasFreelancer?: boolean
): { text: string; variant: 'success' | 'error' | 'warning' | 'info' | 'default' | 'expired' | 'pending' | 'active' | 'completed' | 'disputed' | 'cancelled' } => {
  const stateStr = typeof state === 'string' ? state : 'Active';
  
  const applyDeadlineExpired = applyDeadline
    ? applyDeadline * 1000 < Date.now() 
    : false;
  const isExpiredPosted = stateStr === 'Posted' && applyDeadlineExpired && !hasFreelancer;
  
  if (isExpiredPosted) {
    return { text: 'Hết hạn đăng ký', variant: 'expired' };
  }
  if (stateStr === 'Posted') {
    return { text: 'Mở', variant: 'active' };
  }
  if (stateStr === 'PendingApproval') {
    return { text: 'Đang chờ duyệt ứng viên', variant: 'pending' };
  }
  if (stateStr === 'InProgress') {
    return { text: 'Đang thực hiện', variant: 'info' };
  }
  if (stateStr === 'Completed') {
    return { text: 'Hoàn thành', variant: 'completed' };
  }
  if (stateStr === 'Disputed') {
    return { text: 'Tranh chấp', variant: 'disputed' };
  }
  if (stateStr === 'Cancelled' || stateStr === 'CancelledByPoster') {
    return { text: stateStr === 'CancelledByPoster' ? 'Đã hủy bởi người thuê' : 'Đã hủy', variant: 'cancelled' };
  }
  return { text: stateStr || 'Hoạt động', variant: 'default' };
};




