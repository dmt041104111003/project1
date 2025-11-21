export const ROLES = {
  FREELANCER: 'freelancer',
  POSTER: 'poster',
  REVIEWER: 'reviewer',
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleType, string> = {
  [ROLES.FREELANCER]: 'Người làm tự do',
  [ROLES.POSTER]: 'Người thuê',
  [ROLES.REVIEWER]: 'Người đánh giá',
};

export const ROLE_OPTIONS = [
  { value: ROLES.FREELANCER, label: ROLE_LABELS[ROLES.FREELANCER] },
  { value: ROLES.POSTER, label: ROLE_LABELS[ROLES.POSTER] },
  { value: ROLES.REVIEWER, label: ROLE_LABELS[ROLES.REVIEWER] },
];

export const ROLES_REQUIRING_DESCRIPTION = [ROLES.FREELANCER, ROLES.POSTER];

export const API_ENDPOINTS = {
  ROLE: '/api/role',
  PROOF: '/api/proof',
  ZK_GENERATE_PROOF: '/api/zk/generate-proof',
  IPFS_UPLOAD: '/api/ipfs/upload',
} as const;

export const MESSAGES = {
  LOADING: {
    CHECKING_PROOF: 'Đang kiểm tra...',
    LOADING_ROLES: 'Đang tải vai trò...',
    GENERATING_ZK_PROOF: 'Đang tạo xác minh không kiến thức...',
    SAVING_PROOF: 'Đang lưu xác minh không kiến thức vào blockchain...',
    UPLOADING_CID: 'Đang tải CID lên IPFS...',
    CHECKING_PROOF_STATUS: 'Đang kiểm tra xác minh không kiến thức...',
    SUBMITTING_TRANSACTION: 'Đang gửi giao dịch...',
    PROCESSING: 'Đang xử lý...',
  },
  SUCCESS: {
    VERIFICATION_SUCCESS: 'Đã xác minh danh tính thành công',
    PROOF_AND_CID_SUCCESS: 'Đã xác minh danh tính, tạo xác minh không kiến thức và tải CID lên IPFS. Bạn có thể đăng ký vai trò ngay bây giờ.',
    PROOF_SUCCESS: 'Đã xác minh danh tính và tạo xác minh không kiến thức thành công. Bạn có thể đăng ký vai trò ngay bây giờ.',
    REGISTRATION_SUCCESS: 'Đăng ký thành công!',
  },
  ERROR: {
    WALLET_NOT_CONNECTED: 'Vui lòng kết nối ví Aptos',
    PROOF_REQUIRED: 'Vui lòng xác minh danh tính trước khi đăng ký vai trò.',
    PROOF_CHECK_FAILED: 'Không thể kiểm tra trạng thái xác minh không kiến thức. Vui lòng thử lại.',
    DESCRIPTION_REQUIRED: 'Vui lòng điền mô tả trước khi đăng ký vai trò này.',
    CID_REQUIRED: 'CID là bắt buộc cho người làm tự do và người thuê',
    CID_NOT_FOUND: 'Không tìm thấy CID để đăng ký vai trò.',
    INVALID_ROLE: 'Vai trò không hợp lệ',
    ZK_PROOF_FAILED: 'Tạo xác minh không kiến thức thất bại',
    IPFS_UPLOAD_FAILED: 'Tải lên IPFS thất bại',
    REGISTRATION_FAILED: 'Đăng ký thất bại',
    PROOF_OR_ZK_ERROR: 'Lỗi khi tạo hoặc lưu xác minh không kiến thức',
    IPFS_ERROR: 'Lỗi khi tải CID lên IPFS',
    REAUTH_REQUIRED: 'Thông tin CCCD đã được xác minh bởi địa chỉ khác. Vui lòng xác minh lại.',
  },
  STATUS: {
    NO_ROLES: 'Chưa đăng ký vai trò nào',
    WALLET_NOT_CONNECTED: 'Chưa kết nối',
    REGISTERED: 'Đã đăng ký',
    UPDATE_INFO: 'Cập nhật thông tin',
    REGISTER_ROLE: 'Đăng ký vai trò',
    CURRENT_INFO: 'Thông tin hiện tại',
    DESCRIPTION: 'Mô tả',
    SELECT_ROLE: 'Chọn vai trò...',
    DESCRIPTION_PLACEHOLDER: 'Giới thiệu về bạn / kỹ năng...',
  },
} as const;

export const VERIFICATION_STATUS = {
  CHECKING: 'checking',
  NOT_VERIFIED: 'not_verified',
  VERIFIED: 'verified',
} as const;

