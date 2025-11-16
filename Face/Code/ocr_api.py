# import os
# # Tắt OneDNN/MKLDNN - giống như apiCall_Fake_Real.py
# os.environ['FLAGS_use_mkldnn'] = 'False'
# os.environ['FLAGS_onednn'] = 'False'
# os.environ['FLAGS_enable_mkldnn'] = 'False'
# os.environ['MKLDNN_ENABLED'] = '0'

# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import cv2
# import numpy as np

# # Import PaddleOCR và paddle
# from paddleocr import PaddleOCR
# import paddle
# from test_ocr import extract_id_info

# app = Flask(__name__)
# CORS(app)

# ocr_reader = None

# def get_ocr_reader():
#     global ocr_reader
#     if ocr_reader is None:
#         try:
#             # Disable signal handler - QUAN TRỌNG! Giống như apiCall_Fake_Real.py
#             paddle.disable_signal_handler()
            
#             print("Dang khoi tao PaddleOCR (lan dau co the mat vai phut)...")
#             # QUAN TRỌNG: ir_optim=False để tắt IR optimization (nguyên nhân chính của lỗi OneDNN)
#             try:
#                 ocr_reader = PaddleOCR(
#                     use_angle_cls=True, 
#                     lang='vi', 
#                     use_gpu=False,
#                     enable_mkldnn=False,
#                     use_pdserving=False,
#                     use_onnx=False,
#                     ir_optim=False  # TẮT IR optimization - QUAN TRỌNG!
#                 )
#             except Exception as init_error:
#                 print(f"Loi voi cau hinh day du, thu lai voi cau hinh toi thieu: {init_error}")
#                 # Fallback: Cấu hình tối thiểu nhưng vẫn tắt ir_optim
#                 ocr_reader = PaddleOCR(
#                     use_angle_cls=True, 
#                     lang='vi', 
#                     use_gpu=False,
#                     ir_optim=False  # Vẫn tắt IR optimization
#                 )
#             print("PaddleOCR da san sang!")
#         except Exception as e:
#             print(f"Loi khoi tao PaddleOCR: {e}")
#             import traceback
#             traceback.print_exc()
#             return None
#     return ocr_reader

# @app.route('/ocr/extract', methods=['POST'])
# def ocr_extract():
#     try:
#         if 'image' not in request.files:
#             return jsonify({'error': 'Khong co anh'}), 400
        
#         file = request.files['image']
#         if file.filename == '':
#             return jsonify({'error': 'Khong co file'}), 400
        
#         image_bytes = file.read()
#         nparr = np.frombuffer(image_bytes, np.uint8)
#         img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
#         if img is None:
#             return jsonify({'error': 'Khong the doc anh'}), 400
        
#         ocr_reader = get_ocr_reader()
#         if ocr_reader is None:
#             return jsonify({'error': 'Khong the khoi tao PaddleOCR'}), 500
        
#         id_info = extract_id_info(img, ocr_reader)
        
#         if id_info is None:
#             return jsonify({'error': 'Khong the doc thong tin tu anh'}), 500
        
#         return jsonify({
#             'success': True,
#             'data': {
#                 'id_number': id_info.get('id_number'),
#                 'name': id_info.get('name'),
#                 'date_of_birth': id_info.get('date_of_birth'),
#                 'gender': id_info.get('gender'),
#                 'nationality': id_info.get('nationality'),
#                 'date_of_expiry': id_info.get('date_of_expiry'),
#                 'expiry_status': id_info.get('expiry_status'),
#                 'expiry_message': id_info.get('expiry_message')
#             }
#         }), 200
        
#     except Exception as e:
#         return jsonify({'error': f'Loi: {str(e)}'}), 500

# @app.route('/health', methods=['GET'])
# def health():
#     return jsonify({'status': 'ok'}), 200

# if __name__ == '__main__':
#     print("Dang khoi dong OCR API server...")
#     print("API endpoint: POST /ocr/extract")
#     print("Chay tren: http://localhost:5000")
#     app.run(host='0.0.0.0', port=5000, debug=True)

