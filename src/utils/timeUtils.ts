export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (messageDate.getTime() === today.getTime()) {
    return `Hôm nay ${date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export const formatDeadline = (timestamp: number): string => {
  if (!timestamp) return 'Chưa set';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatSeconds = (seconds: number): string => {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days} ngày${hours > 0 ? ` ${hours} giờ` : ''}`;
  if (hours > 0) return `${hours} giờ`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${minutes} phút` : `${seconds} giây`;
};

export const formatDate = (timestamp: number, includeTime = false): string => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  if (includeTime) {
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};


