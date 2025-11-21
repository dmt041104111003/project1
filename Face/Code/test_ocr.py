import cv2
from rapidocr import RapidOCR
import re
import os

def parse_cccd(texts: list[str]):
    data = {
        "cccd": None,
        "full_name": None,
        "dob": None,
        "sex": None,
        "nationality": None,
        "expired": None
    }

    joined = " ".join(texts)

    # --- CCCD ---
    cccd = re.search(r"\b\d{12}\b", joined)
    if cccd:
        data["cccd"] = cccd.group(0)

    for i, t in enumerate(texts):
        if "Ho va ten" in t or "Họ và tên" in t or "Full name" in t:
            # lấy dòng ngay sau
            if i + 1 < len(texts):
                name = texts[i+1].strip()
                # lọc noise
                if len(name.split()) >= 2:
                    data["full_name"] = name
            break

    if not data["full_name"]:
        for t in texts:
            clean = re.sub(r"[^A-Za-zÀ-Ỵà-ỵ ]", "", t).strip()
            if 2 <= len(clean.split()) <= 4:
                # bỏ các cụm quốc hiệu
                if clean not in ("CONG HOA XA HOI CHU NGHIA VIET NAM", 
                                 "DOC LAP TU DO HANH PHUC",
                                 "CAN CUOC CONG DAN"):
                    data["full_name"] = clean
                    break

    # --- DOB ---
    dob = re.search(r"\b\d{2}/\d{2}/\d{4}\b", joined)
    if dob:
        data["dob"] = dob.group(0)

    # --- SEX ---
    for t in texts:
        if "Nam" in t or "NAM" in t:
            data["sex"] = "Nam"
        if "Nữ" in t or "Nu" in t or "NU" in t:
            data["sex"] = "Nữ"

    # --- NATIONALITY ---
    if "Viet Nam" in joined or "VietNam" in joined:
        data["nationality"] = "Việt Nam"

    # --- EXPIRATION ---
    dates = re.findall(r"\d{2}/\d{2}/\d{4}", joined)
    if len(dates) >= 2:
        data["expired"] = dates[-1]

    return data


def extract_id_info(img, ocr_reader):
    if ocr_reader is None:
        return None
    
    try:
        print("Đang đọc text từ ảnh...")
        

        if isinstance(img, str):
            ocr_result = ocr_reader(img)
        else:
            if len(img.shape) == 3 and img.shape[2] == 3:
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            else:
                img_rgb = img
            ocr_result = ocr_reader(img_rgb)

        if isinstance(ocr_result, tuple) and len(ocr_result) >= 3:
            texts = ocr_result[1]  # list_texts là phần tử thứ 2 (index 1)
        elif isinstance(ocr_result, tuple) and len(ocr_result) >= 2:
            texts = ocr_result[1]  # list_texts là phần tử thứ 2
        elif hasattr(ocr_result, 'txts'):
            texts = ocr_result.txts
        elif isinstance(ocr_result, list):
            texts = ocr_result
        else:
            texts = []
        
        if not texts:
            print("\nKhông tìm thấy text nào")
            return None
        
        print(f"\nTìm thấy {len(texts)} dòng text:")
        print("-" * 80)
        for i, text in enumerate(texts):
            print(f"Dòng {i+1}: {text}")
        print("-" * 80)
        
        parsed_data = parse_cccd(texts)
        
        full_text = " ".join(texts)
        
        expiry_status = None
        expiry_message = None
        if parsed_data["expired"]:
            try:
                from datetime import datetime
                expiry_date = datetime.strptime(parsed_data["expired"], '%d/%m/%Y')
                now = datetime.now()
                if expiry_date >= now:
                    days_remaining = (expiry_date - now).days
                    expiry_status = 'valid'
                    expiry_message = f"CCCD còn hạn. Còn {days_remaining} ngày (hết hạn: {parsed_data['expired']})"
                    print(expiry_message)
                else:
                    days_expired = (now - expiry_date).days
                    expiry_status = 'expired'
                    expiry_message = f"CCCD đã hết hạn. Đã hết hạn {days_expired} ngày (hết hạn: {parsed_data['expired']})"
                    print(expiry_message)
            except Exception as e:
                print(f"Lỗi khi kiểm tra ngày hết hạn: {e}")
                expiry_status = 'unknown'
                expiry_message = f"Không thể kiểm tra ngày hết hạn: {parsed_data['expired']}"
        
        # Trả về format tương thích với code cũ
        return {
            'id_number': parsed_data["cccd"],
            'name': parsed_data["full_name"],
            'date_of_birth': parsed_data["dob"],
            'gender': parsed_data["sex"],
            'nationality': parsed_data["nationality"],
            'date_of_expiry': parsed_data["expired"],
            'expiry_status': expiry_status,
            'expiry_message': expiry_message,
            'date_of_issue': None,
            'place_of_issue': None,
            'place_of_origin': None,
            'place_of_residence': None,
            'full_text': full_text,
            'ocr_results': [],  # RapidOCR không trả về bbox chi tiết như PaddleOCR
            'raw_text': texts
        }
    except Exception as e:
        print(f"Lỗi OCR: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    image_path = r"E:\New folder\web2.5Freelancer\Face\cccd.jpg"
    
    if not os.path.exists(image_path):
        print(f"Không tìm thấy file: {image_path}")
        return
    
    print(f"Đang đọc ảnh: {image_path}")
    
    img = cv2.imread(image_path)
    if img is None:
        print("Không thể đọc ảnh. Kiểm tra đường dẫn và format ảnh.")
        return
    
    print(f"Kích thước ảnh: {img.shape[1]}x{img.shape[0]}")
    
    print("\nĐang khởi tạo RapidOCR (lần đầu có thể mất vài phút để download model)...")
    try:
        ocr_reader = RapidOCR()
        print("RapidOCR đã sẵn sàng!\n")
    except Exception as e:
        print(f"Lỗi khởi tạo RapidOCR: {e}")
        return
    
    print("=" * 80)
    print("BẮT ĐẦU OCR")
    print("=" * 80)
    
    id_info = extract_id_info(img, ocr_reader)
    
    print("\n" + "=" * 80)
    print("KẾT QUẢ TỔNG HỢP")
    print("=" * 80)
    
    if id_info:
        print(f"\nThông tin đọc được từ CCCD:")
        print(f"   Số CMND/CCCD: {id_info.get('id_number', 'N/A')}")
        print(f"   Họ và tên: {id_info.get('name', 'N/A')}")
        print(f"   Ngày sinh: {id_info.get('date_of_birth', 'N/A')}")
        print(f"   Giới tính: {id_info.get('gender', 'N/A')}")
        print(f"   Quốc tịch: {id_info.get('nationality', 'N/A')}")
        print(f"   Có giá trị đến: {id_info.get('date_of_expiry', 'N/A')}")
        if id_info.get('expiry_message'):
            print(f"\n{id_info.get('expiry_message')}")
        print(f"\nTổng số vùng text: {len(id_info.get('ocr_results', []))}")
    else:
        print("\nKhông thể đọc thông tin từ ảnh")

if __name__ == "__main__":
    main()
