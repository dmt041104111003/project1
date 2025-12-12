# Face Verification & OCR API

API Flask để xử lý OCR và Face Verification với anti-spoofing.

## Thư viện sử dụng

- **Flask**: https://github.com/pallets/flask
- **RapidOCR**: https://github.com/RapidAI/RapidOCR
- **UniFace**: https://github.com/yakhyo/uniface (thay thế DeepFace - nhẹ hơn, nhanh hơn)
- **OpenCV**: https://github.com/opencv/opencv
- **PyTorch**: https://github.com/pytorch/pytorch
- **Silent-Face-Anti-Spoofing**: https://github.com/minivision-ai/Silent-Face-Anti-Spoofing

## Cài đặt

```bash
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
```

## Chạy

```bash
python verification_api.py
```

API chạy tại `http://localhost:5000`

## API Endpoints

### GET /health
Health check

### POST /ocr/extract
Trích xuất thông tin từ ảnh CCCD/CMND
- Body: `image` (file)

### POST /face/upload_id_card
Upload ảnh CCCD và lưu embedding
- Body: `image` (file), `action: "upload_id_card"`
- Response: `session_id`

### POST /face/verify
Verify khuôn mặt từ webcam
- Body: `image` (file), `action: "verify"`, `session_id`
- Response: `verified`, `similarity`, `is_real`

## Tài liệu

- RapidOCR: https://github.com/RapidAI/RapidOCR
- UniFace: https://github.com/yakhyo/uniface
- Silent-Face-Anti-Spoofing: https://github.com/minivision-ai/Silent-Face-Anti-Spoofing
- Flask: https://flask.palletsprojects.com/
- OpenCV: https://docs.opencv.org/

## Lưu ý

- Lần đầu chạy RapidOCR sẽ tải models (mất vài phút)

