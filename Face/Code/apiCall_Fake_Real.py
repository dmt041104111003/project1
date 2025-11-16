from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
from PIL import Image
from io import BytesIO
from my_test import test
import cv2
import os
import time
import re

app = Flask(__name__)
CORS(app)


embedding_card = None
# Per-session embeddings to prevent skipping steps and cross-user leakage
sessions = {}  # session_id -> { 'embedding': np.ndarray, 'created': float }
MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../resources/anti_spoof_models'))

def read_image(file_storage):
    try:
        image = Image.open(BytesIO(file_storage.read()))
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"Lỗi đọc ảnh: {e}")
        return None

## OCR and commitment helpers removed

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Face verification API is running"})


@app.route('/upload_id_card', methods=['POST'])
def upload_id_card():
    global embedding_card, sessions
    if 'id_card' not in request.files:
        return jsonify({"error": "Thiếu ảnh căn cước"}), 400
    img_card = read_image(request.files['id_card'])
    if img_card is None or len(img_card.shape) < 3:
        return jsonify({"error": "Ảnh căn cước không hợp lệ"}), 400
    if img_card.shape[2] == 4:
        img_card = cv2.cvtColor(img_card, cv2.COLOR_RGBA2RGB)
    encodings_card = face_recognition.face_encodings(img_card)
    if not encodings_card:
        return jsonify({"error": "Không tìm thấy khuôn mặt trong ảnh căn cước"}), 400
    embedding_card = encodings_card[0]
    # Create a new session id and bind embedding to it
    import os, time
    session_id = os.urandom(16).hex()
    sessions[session_id] = { 'embedding': embedding_card, 'created': time.time() }
    return jsonify({"success": True, "session_id": session_id})

@app.route('/verify_webcam', methods=['POST'])
def verify_webcam():
    try:
        global embedding_card, sessions
        start_time = time.time()

        if 'webcam' not in request.files:
            return jsonify({
                "success": False,
                "message": "Thiếu ảnh webcam"
            }), 400

        # Enforce step order by requiring valid session_id from upload step
        session_id = request.form.get('session_id', '')
        sess = sessions.get(session_id)
        if not sess:
            return jsonify({
                "success": False,
                "message": "Chưa upload căn cước hoặc session không hợp lệ"
            }), 400

        img_webcam = read_image(request.files['webcam'])

        if img_webcam is None or len(img_webcam.shape) < 3:
            return jsonify({
                "success": False,
                "message": "Ảnh webcam không hợp lệ"
            }), 400

        if img_webcam.shape[2] == 4:
            img_webcam = cv2.cvtColor(img_webcam, cv2.COLOR_RGBA2RGB)

        # Anti-spoofing check
        is_real = test(
            image=img_webcam,
            model_dir=MODEL_DIR,
            device_id=0
        )
        if is_real != 1:
            return jsonify({
                "success": False,
                "is_real": False,
                "message": "Khuôn mặt không phải là thật"
            }), 200

        encodings_webcam = face_recognition.face_encodings(img_webcam)
        if not encodings_webcam:
            return jsonify({
                "success": False,
                "message": "Không tìm thấy khuôn mặt trong ảnh webcam"
            }), 400

        embedding_webcam = encodings_webcam[0]
        # Compare against session-bound embedding
        distance = face_recognition.face_distance([sess['embedding']], embedding_webcam)[0]
        is_same = distance <= 0.65
        processing_time = time.time() - start_time

        result = {
            "success": bool(is_same),
            "distance": float(distance),
            "is_real": bool(is_real == 1),
            "processing_time": processing_time,
            "message": "Khuôn mặt khớp với căn cước" if is_same else "Khuôn mặt không khớp với căn cước"
        }
        try:
            print(f"[DEBUG][VERIFY] is_real={is_real} is_same={is_same} distance={distance:.4f}")
        except Exception:
            pass
        if is_same and is_real == 1:
            did = request.form.get('did', '')
            # Để khớp did_registry.create_proof_message: did|timestamp|did_proof
            sign_message = f"{did}|timestamp|did_proof"
            result.update({
                "sign_message": sign_message
            })
        # Optional: cleanup session after attempt (prevent reuse)
        try:
            sessions.pop(session_id, None)
        except Exception:
            pass
        return jsonify(result)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": f"Internal error: {str(e)}"
        }), 500



if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
