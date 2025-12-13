import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import time
from uniface import RetinaFace, ArcFace
from my_test import test

from rapidocr import RapidOCR
from test_ocr import extract_id_info

# Initialize UniFace models (singleton pattern)
_uniface_detector = None
_uniface_recognizer = None

def get_uniface_detector():
    global _uniface_detector
    if _uniface_detector is None:
        print("Đang khởi tạo UniFace RetinaFace detector...")
        _uniface_detector = RetinaFace()
        print("UniFace RetinaFace detector đã sẵn sàng!")
    return _uniface_detector

def get_uniface_recognizer():
    global _uniface_recognizer
    if _uniface_recognizer is None:
        print("Đang khởi tạo UniFace ArcFace recognizer...")
        _uniface_recognizer = ArcFace()
        print("UniFace ArcFace recognizer đã sẵn sàng!")
    return _uniface_recognizer

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../resources/anti_spoof_models'))

ocr_reader = None
sessions = {}
def get_ocr_reader():
    global ocr_reader
    if ocr_reader is None:
        try:
            print("Dang khoi tao RapidOCR (lan dau co the mat vai phut)...")
            ocr_reader = RapidOCR()
            print("RapidOCR da san sang!")
        except Exception as e:
            print(f"Loi khoi tao RapidOCR: {e}")
            import traceback
            traceback.print_exc()
            return None
    return ocr_reader

def read_image_from_bytes(image_bytes):
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            print("Failed to decode image from bytes")
            return None
        if len(img.shape) == 3 and img.shape[2] == 4:
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        if len(img.shape) != 3 or img.shape[2] != 3:
            print(f"Invalid image format: shape={img.shape}")
            return None
        print(f"Decoded image: shape={img.shape}, dtype={img.dtype}, min={img.min()}, max={img.max()}")
        return img
    except Exception as e:
        print(f"Loi doc anh: {e}")
        import traceback
        traceback.print_exc()
        return None

def preprocess_image(img):
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
    """
    Lấy face embedding sử dụng UniFace (RetinaFace + ArcFace)
    
    Args:
        img: BGR image (numpy array từ OpenCV)
    
    Returns:
        Normalized embedding vector (512-dim) hoặc None nếu không tìm thấy khuôn mặt
    """
    try:
        # Preprocess image
        img_processed = preprocess_image(img)
        
        # Convert RGB to BGR for UniFace (UniFace expects BGR like OpenCV)
        if len(img_processed.shape) == 3 and img_processed.shape[2] == 3:
            # img_processed is RGB from preprocess_image, convert back to BGR
            img_bgr = cv2.cvtColor(img_processed, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = img_processed
        
        # Get detector and recognizer
        detector = get_uniface_detector()
        recognizer = get_uniface_recognizer()
        
        # Detect faces
        faces = detector.detect(img_bgr)
        
        if not faces or len(faces) == 0:
            print("UniFace: Không tìm thấy khuôn mặt trong ảnh")
            return None
        
        # Get the first face (highest confidence)
        face = faces[0]
        landmarks = face['landmarks']  # 5-point landmarks
        confidence = face['confidence']
        
        print(f"UniFace: Detected face with confidence: {confidence:.4f}")
        
        # Get normalized embedding using ArcFace
        # get_normalized_embedding returns already L2-normalized embedding
        embedding = recognizer.get_normalized_embedding(img_bgr, landmarks)
        
        if embedding is not None:
            # Flatten if needed (uniface returns shape (1, 512))
            embedding = embedding.flatten()
            print(f"Embedding shape: {embedding.shape}, norm: {np.linalg.norm(embedding):.4f}")
            return embedding
        
        return None
        
    except Exception as e:
        print(f"Lỗi lấy embedding với UniFace: {e}")
        import traceback
        traceback.print_exc()
        return None

def cosine_similarity(emb1, emb2):
    """Tính cosine similarity giữa 2 embedding"""
    return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

@app.route('/ocr/extract', methods=['POST'])
def ocr_extract():
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
            return jsonify({'error': 'Khong the khoi tao RapidOCR'}), 500
        
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

@app.route('/face/upload_id_card', methods=['POST'])
def upload_id_card():
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

@app.route('/face/anti_spoof', methods=['POST'])
def anti_spoof():
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
        
        print("Dang kiem tra anti-spoofing...")
        print(f"Input image shape: {img.shape}")
        
        is_real = test(
            image=img,
            model_dir=MODEL_DIR,
            device_id=0
        )
        
        if is_real is None:
            return jsonify({
                'success': False,
                'is_real': False,
                'error': 'Khuon mat qua nho hoac qua lon trong khung hinh. Vui long chup lai voi khuon mat chiem 25-45% khung hinh.',
                'message': 'Vui lòng di chuyển camera để khuôn mặt chiếm 25-45% khung hình (không quá gần, không quá xa).'
            }), 400
        
        print(f"Anti-spoofing result: label={is_real} (0=that, 1/2=gia)")
        is_real_face = bool(is_real == 0)
        
        return jsonify({
            'success': True,
            'is_real': is_real_face,
            'result': int(is_real),
            'message': 'Khuon mat la that' if is_real_face else f'Khuon mat khong phai la that (label: {is_real}, co the la anh gia, video, hoac mask)'
        }), 200
        
    except Exception as e:
        print(f"Loi anti_spoof: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Loi: {str(e)}'}), 500

@app.route('/face/verify', methods=['POST'])
def verify_face():
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
        
        print("Buoc 1: Dang kiem tra anti-spoofing...")
        is_real = False
        anti_spoof_label = None
        similarity = 0.0
        face_match_passed = False
        
        try:
            anti_spoof_result = test(
                image=img_webcam,
                model_dir=MODEL_DIR,
                device_id=0
            )
            
            if anti_spoof_result is not None:
                anti_spoof_label = int(anti_spoof_result)
                is_real = bool(anti_spoof_result == 0)
                print(f"Anti-spoofing result: label={anti_spoof_label} (0=REAL, 1/2=SPOOF)")
                print(f"Anti-spoofing: {'PASS (REAL)' if is_real else 'FAIL (SPOOF)'}")
            else:
                print("Anti-spoofing: Khong detect duoc face (face qua nho/lon)")
                is_real = False
        except Exception as e:
            print(f"Loi khi check anti-spoofing: {e}")
            import traceback
            traceback.print_exc()
            is_real = False
        
        if is_real:
            print("Buoc 2: Anti-spoofing PASSED, dang lay embedding tu anh webcam...")
            embedding_webcam = get_face_embedding(img_webcam)
            
            if embedding_webcam is None:
                return jsonify({
                    'success': True,
                    'verified': False,
                    'similarity': 0.0,
                    'threshold': 0.5,
                    'face_match_passed': False,
                    'is_real': True,
                    'anti_spoof_label': anti_spoof_label,
                    'message': 'Anti-spoofing pass nhung khong tim thay khuon mat trong anh webcam'
                }), 200
            
            embedding_card = sess['embedding']
            similarity = cosine_similarity(embedding_card, embedding_webcam)
            
            threshold = 0.5  # Practical threshold for CCCD (small face images)
            face_match_passed = bool(similarity >= threshold)
            
            print(f"Face matching - Similarity: {similarity:.4f}, Threshold: {threshold:.4f}")
            print(f"Face matching: {'PASS' if face_match_passed else 'FAIL'}")
        else:
            print("Anti-spoofing FAILED, bo qua face matching")
        
        final_verified = is_real and face_match_passed
        
        print(f"Final result: {'PASS 100%' if final_verified else 'FAIL'}")
        if not is_real:
            print("Anti-spoofing FAIL (co the la anh gia/video/man hinh)")
        elif is_real and not face_match_passed:
            print("Anti-spoofing PASS nhung face matching FAIL (khong phai cung nguoi)")
        
        return jsonify({
            'success': True,
            'verified': final_verified,
            'similarity': float(similarity) if is_real else 0.0,
            'threshold': 0.5,
            'face_match_passed': face_match_passed,
            'is_real': is_real,
            'anti_spoof_label': anti_spoof_label,
            'message': 'Xac minh thanh cong' if final_verified else (
                'Khong phai tu camera that (co the la anh gia, video, hoac man hinh)' if not is_real
                else 'Khuon mat khong khop'
            )
        }), 200
        
    except Exception as e:
        print(f"Loi verify_face: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Loi: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    print("=" * 80)
    print("Dang khoi dong Verification API server (OCR + Face Verification)...")
    print("=" * 80)
    print("API endpoints:")
    print("  POST /ocr/extract - OCR tu anh CCCD")
    print("  POST /face/upload_id_card - Upload anh CCCD va luu embedding (Face Matching)")
    print("  POST /face/verify - Verify anh webcam voi anh CCCD (Face Matching only - nhin thang 5 giay)")
    print("  GET /health - Health check")
    print("=" * 80)
    print("Chay tren: http://localhost:5000")
    print("=" * 80)
    app.run(host='0.0.0.0', port=5000, debug=True)

