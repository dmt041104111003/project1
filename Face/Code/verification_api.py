import os
# Tắt OneDNN/MKLDNN - giống như apiCall_Fake_Real.py
os.environ['FLAGS_use_mkldnn'] = 'False'
os.environ['FLAGS_onednn'] = 'False'
os.environ['FLAGS_enable_mkldnn'] = 'False'
os.environ['MKLDNN_ENABLED'] = '0'

# Fix conflict protobuf giữa TensorFlow và PaddlePaddle
# TensorFlow cần protobuf >= 5.28.0, PaddlePaddle 2.6.1 cần <= 3.20.2
# Dùng pure Python implementation để tương thích (chậm hơn nhưng hoạt động)
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import time
from deepface import DeepFace
from my_test import test

# Import PaddleOCR và paddle
from paddleocr import PaddleOCR
import paddle
from test_ocr import extract_id_info

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../resources/anti_spoof_models'))

# Lưu trữ OCR reader và sessions
ocr_reader = None
sessions = {}

# ==============================
# OCR FUNCTIONS
# ==============================
def get_ocr_reader():
    global ocr_reader
    if ocr_reader is None:
        try:
            # Disable signal handler - QUAN TRỌNG! Giống như apiCall_Fake_Real.py
            paddle.disable_signal_handler()
            
            print("Dang khoi tao PaddleOCR (lan dau co the mat vai phut)...")
            # QUAN TRỌNG: ir_optim=False để tắt IR optimization (nguyên nhân chính của lỗi OneDNN)
            try:
                ocr_reader = PaddleOCR(
                    use_angle_cls=True, 
                    lang='vi', 
                    use_gpu=False,
                    enable_mkldnn=False,
                    use_pdserving=False,
                    use_onnx=False,
                    ir_optim=False  # TẮT IR optimization - QUAN TRỌNG!
                )
            except Exception as init_error:
                print(f"Loi voi cau hinh day du, thu lai voi cau hinh toi thieu: {init_error}")
                # Fallback: Cấu hình tối thiểu nhưng vẫn tắt ir_optim
                ocr_reader = PaddleOCR(
                    use_angle_cls=True, 
                    lang='vi', 
                    use_gpu=False,
                    ir_optim=False  # Vẫn tắt IR optimization
                )
            print("PaddleOCR da san sang!")
        except Exception as e:
            print(f"Loi khoi tao PaddleOCR: {e}")
            import traceback
            traceback.print_exc()
            return None
    return ocr_reader

# ==============================
# FACE VERIFICATION FUNCTIONS
# ==============================
def read_image_from_bytes(image_bytes):
    """Đọc ảnh từ bytes"""
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        if len(img.shape) == 3 and img.shape[2] == 4:
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        return img
    except Exception as e:
        print(f"Loi doc anh: {e}")
        return None

def get_face_embedding(img):
    """Lấy embedding của khuôn mặt từ ảnh"""
    temp_path = None
    try:
        temp_path = f"temp_face_{int(time.time())}_{hash(time.time())}.jpg"
        cv2.imwrite(temp_path, img)
        
        embedding_obj = DeepFace.represent(
            img_path=temp_path,
            model_name='ArcFace',
            detector_backend='opencv',
            enforce_detection=True
        )
        
        if len(embedding_obj) > 0:
            embedding = np.array(embedding_obj[0]['embedding'])
            # Normalize embedding
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            return embedding
        return None
    except Exception as e:
        print(f"Loi lay embedding: {e}")
        return None
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

def cosine_similarity(emb1, emb2):
    """Tính cosine similarity giữa 2 embedding"""
    return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

# ==============================
# OCR ENDPOINTS
# ==============================
@app.route('/ocr/extract', methods=['POST'])
def ocr_extract():
    """OCR từ ảnh CCCD"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'Khong co anh'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'Khong co file'}), 400
        
        image_bytes = file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Khong the doc anh'}), 400
        
        ocr_reader = get_ocr_reader()
        if ocr_reader is None:
            return jsonify({'error': 'Khong the khoi tao PaddleOCR'}), 500
        
        id_info = extract_id_info(img, ocr_reader)
        
        if id_info is None:
            return jsonify({'error': 'Khong the doc thong tin tu anh'}), 500
        
        return jsonify({
            'success': True,
            'data': {
                'id_number': id_info.get('id_number'),
                'name': id_info.get('name'),
                'date_of_birth': id_info.get('date_of_birth'),
                'gender': id_info.get('gender'),
                'nationality': id_info.get('nationality'),
                'date_of_expiry': id_info.get('date_of_expiry'),
                'expiry_status': id_info.get('expiry_status'),
                'expiry_message': id_info.get('expiry_message')
            }
        }), 200
        
    except Exception as e:
        print(f"Loi OCR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Loi: {str(e)}'}), 500

# ==============================
# FACE VERIFICATION ENDPOINTS
# ==============================
@app.route('/face/upload_id_card', methods=['POST'])
def upload_id_card():
    """Upload ảnh CCCD và lưu embedding"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'Khong co anh'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'Khong co file'}), 400
        
        image_bytes = file.read()
        img = read_image_from_bytes(image_bytes)
        
        if img is None:
            return jsonify({'error': 'Khong the doc anh'}), 400
        
        print("Dang lay embedding tu anh CCCD...")
        embedding = get_face_embedding(img)
        
        if embedding is None:
            return jsonify({'error': 'Khong tim thay khuon mat trong anh CCCD'}), 400
        
        # Tạo session ID
        session_id = os.urandom(16).hex()
        sessions[session_id] = {
            'embedding': embedding,
            'created': time.time()
        }
        
        print(f"Da luu embedding cho session: {session_id}")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'Da luu embedding tu anh CCCD'
        }), 200
        
    except Exception as e:
        print(f"Loi upload_id_card: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Loi: {str(e)}'}), 500

@app.route('/face/verify', methods=['POST'])
def verify_face():
    """Verify ảnh webcam với ảnh CCCD đã upload"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'Khong co anh webcam'}), 400
        
        session_id = request.form.get('session_id', '')
        if not session_id:
            return jsonify({'error': 'Khong co session_id'}), 400
        
        sess = sessions.get(session_id)
        if not sess:
            return jsonify({'error': 'Session khong hop le hoac da het han'}), 400
        
        file = request.files['image']
        image_bytes = file.read()
        img_webcam = read_image_from_bytes(image_bytes)
        
        if img_webcam is None:
            return jsonify({'error': 'Khong the doc anh webcam'}), 400
        
        # Kiểm tra anti-spoofing
        print("Dang kiem tra anti-spoofing...")
        is_real = test(
            image=img_webcam,
            model_dir=MODEL_DIR,
            device_id=0
        )
        
        print(f"Anti-spoofing result: {is_real} (1=that, 0=gia)")
        
        if is_real != 1:
            return jsonify({
                'success': False,
                'verified': False,
                'is_real': False,
                'message': 'Khuon mat khong phai la that'
            }), 200
        
        # Lấy embedding từ ảnh webcam
        print("Dang lay embedding tu anh webcam...")
        embedding_webcam = get_face_embedding(img_webcam)
        
        if embedding_webcam is None:
            return jsonify({'error': 'Khong tim thay khuon mat trong anh webcam'}), 400
        
        # So sánh embedding
        embedding_card = sess['embedding']
        similarity = cosine_similarity(embedding_card, embedding_webcam)
        
        # Threshold cho ArcFace với cosine distance
        threshold = 0.6
        verified = bool(similarity >= threshold)  # Convert numpy bool_ to Python bool
        
        print(f"Similarity: {similarity:.4f}")
        print(f"Threshold: {threshold:.4f}")
        print(f"Ket qua: {'KHOP' if verified else 'KHONG KHOP'}")
        
        return jsonify({
            'success': True,
            'verified': verified,
            'is_real': True,
            'similarity': float(similarity),
            'threshold': float(threshold),
            'message': 'Khuon mat khop' if verified else 'Khuon mat khong khop'
        }), 200
        
    except Exception as e:
        print(f"Loi verify_face: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Loi: {str(e)}'}), 500

# ==============================
# HEALTH CHECK
# ==============================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    print("=" * 80)
    print("Dang khoi dong Verification API server (OCR + Face Verification)...")
    print("=" * 80)
    print("API endpoints:")
    print("  POST /ocr/extract - OCR tu anh CCCD")
    print("  POST /face/upload_id_card - Upload anh CCCD va luu embedding")
    print("  POST /face/verify - Verify anh webcam voi anh CCCD")
    print("  GET /health - Health check")
    print("=" * 80)
    print("Chay tren: http://localhost:5000")
    print("=" * 80)
    app.run(host='0.0.0.0', port=5000, debug=True)

