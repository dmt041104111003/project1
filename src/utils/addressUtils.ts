import { toast } from 'sonner';

export const formatAddress = (address: string | null | undefined): string => {
  if (!address) return '-';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const copyAddress = async (address: string | null | undefined): Promise<void> => {
  if (!address) {
    toast.error('Không có địa chỉ để copy');
    return;
  }

  try {
    await navigator.clipboard.writeText(address);
    toast.success('Đã copy địa chỉ vào clipboard');
  } catch (err) {
    toast.error('Không thể copy địa chỉ');
  }
};

export const copyText = async (
  text: string | null | undefined,
  successMessage = 'Đã copy nội dung',
  errorMessage = 'Không thể copy nội dung'
): Promise<void> => {
  if (text === undefined || text === null || text === '') {
    toast.error(errorMessage);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch (err) {
    toast.error(errorMessage);
  }
};

