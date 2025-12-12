# -*- coding: utf-8 -*-
"""
Test Final - Kiểm tra toàn bộ luồng xác minh danh tính

Luồng test:
1. OCR: Đọc thông tin từ ảnh CCCD
2. Upload ID Card: Lấy embedding từ khuôn mặt trên CCCD
3. Anti-Spoofing: Kiểm tra ảnh webcam có phải là thật không
4. Face Verify: So khớp khuôn mặt webcam với CCCD

Cách dùng:
    python test_final.py --cccd path/to/cccd.jpg --webcam path/to/webcam.jpg
    
Hoặc test với ảnh mặc định:
    python test_final.py
"""

import os
import sys
import cv2
import numpy as np
import argparse
import time

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rapidocr import RapidOCR
from test_ocr import extract_id_info
from my_test import test as anti_spoof_test
from uniface import RetinaFace, ArcFace

# ============================================================================
# Configuration
# ============================================================================
MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../resources/anti_spoof_models'))
SIMILARITY_THRESHOLD = 0.5  # Practical threshold for CCCD (small face images)

# ============================================================================
# Initialize models (lazy loading)
# ============================================================================
_ocr_reader = None
_uniface_detector = None
_uniface_recognizer = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        print("\n[OCR] Đang khởi tạo RapidOCR...")
        _ocr_reader = RapidOCR()
        print("[OCR] RapidOCR đã sẵn sàng!")
    return _ocr_reader

def get_uniface_detector():
    global _uniface_detector
    if _uniface_detector is None:
        print("\n[UniFace] Đang khởi tạo RetinaFace detector...")
        _uniface_detector = RetinaFace()
        print("[UniFace] RetinaFace detector đã sẵn sàng!")
    return _uniface_detector

def get_uniface_recognizer():
    global _uniface_recognizer
    if _uniface_recognizer is None:
        print("\n[UniFace] Đang khởi tạo ArcFace recognizer...")
        _uniface_recognizer = ArcFace()
        print("[UniFace] ArcFace recognizer đã sẵn sàng!")
    return _uniface_recognizer

# ============================================================================
# Helper Functions
# ============================================================================
def capture_from_webcam():
    """Mở webcam và chụp ảnh khuôn mặt"""
    print("\n" + "=" * 80)
    print("📷 MỞ WEBCAM - CHỤP ẢNH KHUÔN MẶT")
    print("=" * 80)
    print("   Nhấn SPACE hoặc ENTER để chụp ảnh")
    print("   Nhấn Q hoặc ESC để thoát")
    print("=" * 80)
    
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("[ERROR] Không thể mở webcam!")
        return None
    
    # Set resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    captured_frame = None
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Không thể đọc frame từ webcam")
            break
        
        # Hiển thị hướng dẫn trên frame
        display_frame = frame.copy()
        cv2.putText(display_frame, "SPACE/ENTER: Chup anh | Q/ESC: Thoat", 
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(display_frame, "Dat khuon mat vao giua khung hinh", 
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        
        # Vẽ khung hướng dẫn đặt mặt
        h, w = frame.shape[:2]
        box_size = min(h, w) // 2
        x1 = (w - box_size) // 2
        y1 = (h - box_size) // 2
        x2 = x1 + box_size
        y2 = y1 + box_size
        cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        
        cv2.imshow("Webcam - Face Capture", display_frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        # SPACE (32) hoặc ENTER (13) để chụp
        if key == 32 or key == 13:
            captured_frame = frame.copy()
            print("\n✅ Đã chụp ảnh!")
            break
        
        # Q (113) hoặc ESC (27) để thoát
        if key == ord('q') or key == 27:
            print("\n⚠️ Đã hủy chụp ảnh")
            break
    
    cap.release()
    cv2.destroyAllWindows()
    
    return captured_frame

def load_image(image_path):
    """Load ảnh từ file path"""
    if not os.path.exists(image_path):
        print(f"[ERROR] Không tìm thấy file: {image_path}")
        return None
    
    img = cv2.imread(image_path)
    if img is None:
        print(f"[ERROR] Không thể đọc ảnh: {image_path}")
        return None
    
    print(f"[INFO] Đã load ảnh: {image_path} (shape: {img.shape})")
    return img

def preprocess_image(img):
    """Tiền xử lý ảnh (điều chỉnh độ sáng)"""
    if len(img.shape) == 3 and img.shape[2] == 3:
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    else:
        img_rgb = img
    
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY) if len(img_rgb.shape) == 3 else img_rgb
    mean_brightness = np.mean(gray)
    
    if mean_brightness < 50:
        img_rgb = cv2.convertScaleAbs(img_rgb, alpha=1.2, beta=20)
    elif mean_brightness > 200:
        img_rgb = cv2.convertScaleAbs(img_rgb, alpha=0.9, beta=-10)
    
    return img_rgb

def get_face_embedding(img):
    """Lấy face embedding từ ảnh sử dụng UniFace"""
    try:
        img_processed = preprocess_image(img)
        
        # Convert RGB to BGR for UniFace
        if len(img_processed.shape) == 3 and img_processed.shape[2] == 3:
            img_bgr = cv2.cvtColor(img_processed, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = img_processed
        
        detector = get_uniface_detector()
        recognizer = get_uniface_recognizer()
        
        # Detect faces
        faces = detector.detect(img_bgr)
        
        if not faces or len(faces) == 0:
            print("[UniFace] Không tìm thấy khuôn mặt trong ảnh")
            return None
        
        # Get the first face
        face = faces[0]
        landmarks = face['landmarks']
        confidence = face['confidence']
        bbox = face['bbox']
        
        print(f"[UniFace] Detected face - confidence: {confidence:.4f}, bbox: {bbox}")
        
        # Get normalized embedding
        embedding = recognizer.get_normalized_embedding(img_bgr, landmarks)
        
        if embedding is not None:
            embedding = embedding.flatten()
            print(f"[UniFace] Embedding shape: {embedding.shape}, norm: {np.linalg.norm(embedding):.4f}")
            return embedding
        
        return None
        
    except Exception as e:
        print(f"[ERROR] Lỗi lấy embedding: {e}")
        import traceback
        traceback.print_exc()
        return None

def cosine_similarity(emb1, emb2):
    """Tính cosine similarity giữa 2 embedding"""
    return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

# ============================================================================
# Test Functions
# ============================================================================
def test_ocr(img):
    """Test 1: OCR - Đọc thông tin từ ảnh CCCD"""
    print("\n" + "=" * 80)
    print("TEST 1: OCR - ĐỌC THÔNG TIN TỪ ẢNH CCCD")
    print("=" * 80)
    
    start_time = time.time()
    
    try:
        ocr_reader = get_ocr_reader()
        id_info = extract_id_info(img, ocr_reader)
        
        elapsed = time.time() - start_time
        
        if id_info:
            print(f"\n✅ OCR THÀNH CÔNG (thời gian: {elapsed:.2f}s)")
            print("-" * 40)
            print(f"   Số CCCD:      {id_info.get('id_number', 'N/A')}")
            print(f"   Họ và tên:    {id_info.get('name', 'N/A')}")
            print(f"   Ngày sinh:    {id_info.get('date_of_birth', 'N/A')}")
            print(f"   Giới tính:    {id_info.get('gender', 'N/A')}")
            print(f"   Quốc tịch:    {id_info.get('nationality', 'N/A')}")
            print(f"   Có giá trị:   {id_info.get('date_of_expiry', 'N/A')}")
            if id_info.get('expiry_message'):
                print(f"   Trạng thái:   {id_info.get('expiry_message')}")
            return True, id_info
        else:
            print(f"\n❌ OCR THẤT BẠI - Không đọc được thông tin")
            return False, None
            
    except Exception as e:
        print(f"\n❌ OCR LỖI: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_upload_id_card(img):
    """Test 2: Upload ID Card - Lấy embedding từ khuôn mặt trên CCCD"""
    print("\n" + "=" * 80)
    print("TEST 2: UPLOAD ID CARD - LẤY EMBEDDING TỪ KHUÔN MẶT CCCD")
    print("=" * 80)
    
    start_time = time.time()
    
    try:
        embedding = get_face_embedding(img)
        elapsed = time.time() - start_time
        
        if embedding is not None:
            print(f"\n✅ LẤY EMBEDDING THÀNH CÔNG (thời gian: {elapsed:.2f}s)")
            print(f"   Embedding dimension: {len(embedding)}")
            print(f"   Embedding norm: {np.linalg.norm(embedding):.4f}")
            return True, embedding
        else:
            print(f"\n❌ LẤY EMBEDDING THẤT BẠI - Không tìm thấy khuôn mặt")
            return False, None
            
    except Exception as e:
        print(f"\n❌ LẤY EMBEDDING LỖI: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_anti_spoof(img):
    """Test 3: Anti-Spoofing - Kiểm tra ảnh có phải là thật không"""
    print("\n" + "=" * 80)
    print("TEST 3: ANTI-SPOOFING - KIỂM TRA ẢNH CÓ PHẢI LÀ THẬT KHÔNG")
    print("=" * 80)
    
    start_time = time.time()
    
    try:
        result = anti_spoof_test(
            image=img,
            model_dir=MODEL_DIR,
            device_id=0
        )
        elapsed = time.time() - start_time
        
        if result is None:
            print(f"\n⚠️ ANTI-SPOOFING: Không detect được khuôn mặt (quá nhỏ/lớn)")
            return False, None
        
        is_real = (result == 0)
        label_map = {0: "✅ REAL (Thật)", 1: "❌ PAPER SPOOF (Ảnh giấy/in)", 2: "❌ DIGITAL SPOOF (Màn hình)"}
        
        if is_real:
            print(f"\n✅ ANTI-SPOOFING PASS (thời gian: {elapsed:.2f}s)")
        else:
            print(f"\n❌ ANTI-SPOOFING FAIL (thời gian: {elapsed:.2f}s)")
        
        print(f"   Kết quả: {label_map.get(result, f'Unknown ({result})')}")
        return is_real, result
        
    except Exception as e:
        print(f"\n❌ ANTI-SPOOFING LỖI: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_face_verify(embedding_cccd, img_webcam):
    """Test 4: Face Verify - So khớp khuôn mặt"""
    print("\n" + "=" * 80)
    print("TEST 4: FACE VERIFY - SO KHỚP KHUÔN MẶT")
    print("=" * 80)
    
    start_time = time.time()
    
    try:
        # Lấy embedding từ ảnh webcam
        embedding_webcam = get_face_embedding(img_webcam)
        
        if embedding_webcam is None:
            print(f"\n❌ FACE VERIFY THẤT BẠI - Không tìm thấy khuôn mặt trong ảnh webcam")
            return False, 0.0
        
        # Tính similarity
        similarity = cosine_similarity(embedding_cccd, embedding_webcam)
        elapsed = time.time() - start_time
        
        is_match = similarity >= SIMILARITY_THRESHOLD
        
        if is_match:
            print(f"\n✅ FACE VERIFY PASS (thời gian: {elapsed:.2f}s)")
        else:
            print(f"\n❌ FACE VERIFY FAIL (thời gian: {elapsed:.2f}s)")
        
        print(f"   Similarity: {similarity:.4f}")
        print(f"   Threshold:  {SIMILARITY_THRESHOLD}")
        print(f"   Kết quả:    {'CÙNG NGƯỜI' if is_match else 'KHÁC NGƯỜI'}")
        
        return is_match, similarity
        
    except Exception as e:
        print(f"\n❌ FACE VERIFY LỖI: {e}")
        import traceback
        traceback.print_exc()
        return False, 0.0

def run_full_test(cccd_path, webcam_path=None, use_webcam=True):
    """Chạy toàn bộ test
    
    Args:
        cccd_path: Đường dẫn ảnh CCCD
        webcam_path: Đường dẫn ảnh webcam (nếu có)
        use_webcam: True = mở webcam chụp trực tiếp, False = dùng ảnh file
    """
    print("\n" + "=" * 80)
    print("🚀 BẮT ĐẦU TEST TOÀN BỘ LUỒNG XÁC MINH DANH TÍNH")
    print("=" * 80)
    print(f"   Ảnh CCCD:   {cccd_path}")
    if webcam_path:
        print(f"   Ảnh Webcam: {webcam_path}")
    elif use_webcam:
        print(f"   Ảnh Webcam: (sẽ chụp từ webcam)")
    else:
        print(f"   Ảnh Webcam: (dùng ảnh CCCD để test)")
    
    total_start = time.time()
    results = {
        'ocr': False,
        'upload_id': False,
        'anti_spoof': False,
        'face_verify': False
    }
    
    # Load ảnh CCCD
    img_cccd = load_image(cccd_path)
    if img_cccd is None:
        print("\n❌ KHÔNG THỂ LOAD ẢNH CCCD")
        return results
    
    # Load ảnh webcam
    img_webcam = None
    if webcam_path:
        # Dùng ảnh từ file
        img_webcam = load_image(webcam_path)
        if img_webcam is None:
            print("\n⚠️ Không thể load ảnh webcam từ file")
    elif use_webcam:
        # Chụp từ webcam trực tiếp
        img_webcam = capture_from_webcam()
        if img_webcam is None:
            print("\n⚠️ Không thể chụp ảnh từ webcam")
    
    # Fallback: dùng ảnh CCCD
    if img_webcam is None:
        print("\n[INFO] Dùng ảnh CCCD để test face matching")
        img_webcam = img_cccd
    
    # ========================================================================
    # Test 1: OCR
    # ========================================================================
    results['ocr'], id_info = test_ocr(img_cccd)
    
    # ========================================================================
    # Test 2: Upload ID Card (lấy embedding)
    # ========================================================================
    results['upload_id'], embedding_cccd = test_upload_id_card(img_cccd)
    
    if not results['upload_id']:
        print("\n❌ DỪNG TEST - Không lấy được embedding từ CCCD")
        return results
    
    # ========================================================================
    # Test 3: Anti-Spoofing (trên ảnh webcam)
    # ========================================================================
    results['anti_spoof'], anti_spoof_label = test_anti_spoof(img_webcam)
    
    # ========================================================================
    # Test 4: Face Verify
    # ========================================================================
    results['face_verify'], similarity = test_face_verify(embedding_cccd, img_webcam)
    
    # ========================================================================
    # Tổng kết
    # ========================================================================
    total_elapsed = time.time() - total_start
    
    print("\n" + "=" * 80)
    print("📊 TỔNG KẾT KẾT QUẢ TEST")
    print("=" * 80)
    print(f"   1. OCR:           {'✅ PASS' if results['ocr'] else '❌ FAIL'}")
    print(f"   2. Upload ID:     {'✅ PASS' if results['upload_id'] else '❌ FAIL'}")
    print(f"   3. Anti-Spoof:    {'✅ PASS' if results['anti_spoof'] else '❌ FAIL'}")
    print(f"   4. Face Verify:   {'✅ PASS' if results['face_verify'] else '❌ FAIL'}")
    print("-" * 40)
    
    all_passed = all(results.values())
    if all_passed:
        print(f"   🎉 TẤT CẢ TEST ĐỀU PASS!")
    else:
        failed = [k for k, v in results.items() if not v]
        print(f"   ⚠️ CÁC TEST FAIL: {', '.join(failed)}")
    
    print(f"\n   Tổng thời gian: {total_elapsed:.2f}s")
    print("=" * 80)
    
    return results

# ============================================================================
# Main
# ============================================================================
def main():
    parser = argparse.ArgumentParser(description='Test Final - Kiểm tra toàn bộ luồng xác minh danh tính')
    parser.add_argument('--cccd', type=str, help='Đường dẫn đến ảnh CCCD')
    parser.add_argument('--webcam', type=str, help='Đường dẫn đến ảnh webcam (tùy chọn, nếu không có sẽ mở webcam)')
    parser.add_argument('--no-cam', action='store_true', help='Không mở webcam, dùng ảnh CCCD để test')
    args = parser.parse_args()
    
    # Đường dẫn ảnh mặc định
    DEFAULT_CCCD_PATH = r"C:\Users\ADMIN\Downloads\zkp\cccd2.jpg"
    
    # Sử dụng argument hoặc đường dẫn mặc định
    cccd_path = args.cccd if args.cccd else DEFAULT_CCCD_PATH
    
    if not os.path.exists(cccd_path):
        print("\n" + "=" * 80)
        print("❌ KHÔNG TÌM THẤY ẢNH")
        print("=" * 80)
        print(f"\nĐường dẫn không tồn tại: {cccd_path}")
        print("\nCách dùng:")
        print("  python test_final.py --cccd path/to/cccd.jpg")
        print("  python test_final.py --cccd path/to/cccd.jpg --webcam path/to/webcam.jpg")
        print("  python test_final.py --no-cam  (không mở webcam, dùng ảnh CCCD)")
        return
    
    # Chạy test
    use_webcam = not args.no_cam
    run_full_test(cccd_path, args.webcam, use_webcam)

if __name__ == "__main__":
    main()

