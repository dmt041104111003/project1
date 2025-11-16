import cv2
from paddleocr import PaddleOCR
import re
import os

def preprocess_image_for_ocr(img):
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    denoised = cv2.fastNlMeansDenoising(enhanced, h=10)
    _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh

def extract_id_info(img, ocr_reader):
    if ocr_reader is None:
        return None
    
    try:
        if len(img.shape) == 3 and img.shape[2] == 3:
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        else:
            img_rgb = img
        
        print("Đang đọc text từ ảnh...")
        results = ocr_reader.ocr(img_rgb, cls=True)
        ocr_data = []
        
        if results and results[0]:
            print(f"\nTìm thấy {len(results[0])} vùng text:")
            print("-" * 80)
            
            for line in results[0]:
                if line and len(line) >= 2:
                    bbox = line[0]
                    text_info = line[1]
                    
                    if len(text_info) >= 2:
                        text = text_info[0]
                        confidence = text_info[1]
                        
                        if confidence > 0.5:
                            y_center = sum([point[1] for point in bbox]) / len(bbox)
                            x_center = sum([point[0] for point in bbox]) / len(bbox)
                            
                            ocr_data.append({
                                'text': text,
                                'confidence': float(confidence),
                                'bbox': bbox,
                                'y_center': y_center,
                                'x_center': x_center
                            })
                            print(f"Confidence: {confidence:.2f} | Y: {y_center:.1f} | Text: {text}")
        else:
            print("\nKhông tìm thấy text nào")
        
        print("-" * 80)
        
        ocr_data.sort(key=lambda x: (x['y_center'], x['x_center']))
        all_text = [item['text'] for item in ocr_data]
        full_text = ' '.join(all_text)
        
        structured_lines = []
        current_line = []
        current_y = None
        y_threshold = 20
        
        for item in ocr_data:
            if current_y is None or abs(item['y_center'] - current_y) > y_threshold:
                if current_line:
                    structured_lines.append(' '.join(current_line))
                current_line = [item['text']]
                current_y = item['y_center']
            else:
                current_line.append(item['text'])
        
        if current_line:
            structured_lines.append(' '.join(current_line))
        
        structured_text = '\n'.join(structured_lines)
        print(f"\nToàn bộ text đọc được (có cấu trúc):\n{structured_text}\n")
        print(f"Toàn bộ text (một dòng):\n{full_text}\n")
        
        id_number = None
        id_patterns = [
            r'\b\d{9}\b',
            r'\b\d{12}\b',
        ]
        for pattern in id_patterns:
            matches = re.findall(pattern, full_text)
            if matches:
                id_number = matches[0]
                print(f"Tìm thấy số CMND/CCCD: {id_number}")
                break
        
        if not id_number:
            print("Không tìm thấy số CMND/CCCD")
        
        name = None
        name_keywords = [
            'Ho va ten', 'Họ và tên', 'Họ tên', 'Tên', 
            'HO VA TEN', 'HO TEN', 'Full name', 'FULL NAME',
            'Ho va ten/', 'Họ và tên/', 'Full name:'
        ]
        
        stop_keywords = [
            'Ngay sinh', 'Date of birth', 'Ngày sinh',
            'Gioi tinh', 'Sex', 'Giới tính',
            'Quoc tich', 'Nationality', 'Quốc tịch'
        ]
        
        for keyword in name_keywords:
            idx = full_text.find(keyword)
            if idx != -1:
                after_keyword = full_text[idx + len(keyword):].strip()
                after_keyword = re.sub(r'^[/:\-\.\s]+', '', after_keyword)
                
                stop_idx = len(after_keyword)
                for stop_kw in stop_keywords:
                    stop_pos = after_keyword.find(stop_kw)
                    if stop_pos != -1 and stop_pos < stop_idx:
                        stop_idx = stop_pos
                
                name_text = after_keyword[:stop_idx].strip()
                name_text = re.sub(r'\b(Full\s+name|FULL\s+NAME)\b', '', name_text, flags=re.IGNORECASE).strip()
                name_text = re.sub(r'^[/:\-\.\s]+', '', name_text)
                
                words = name_text.split()
                name_parts = []
                skip_words = ['full', 'name', 'ho', 'va', 'ten', 'họ', 'và', 'tên']
                
                for word in words:
                    clean_word = re.sub(r'[^A-Za-zÀ-ỹ0-9]', '', word)
                    if clean_word.lower() in skip_words:
                        continue
                    if clean_word and any(c.isalpha() for c in clean_word) and len(clean_word) > 1:
                        name_parts.append(clean_word)
                        if len(name_parts) >= 3:
                            break
                
                if name_parts:
                    name = ' '.join(name_parts)
                    print(f"Tìm thấy tên: {name}")
                    break
        
        if not name:
            print("Không tìm thấy tên")
        
        dob = None
        dob_patterns = [
            r'\d{2}/\d{2}/\d{4}',
            r'\d{2}-\d{2}-\d{4}',
        ]
        for pattern in dob_patterns:
            matches = re.findall(pattern, full_text)
            if matches:
                dob = matches[0]
                print(f"Tìm thấy ngày sinh: {dob}")
                break
        
        if not dob:
            print("Không tìm thấy ngày sinh")
        
        gender = None
        gender_keywords = ['Nam', 'Nữ', 'NAM', 'NU']
        for keyword in gender_keywords:
            if keyword in full_text:
                gender = keyword
                print(f"Tìm thấy giới tính: {gender}")
                break
        
        nationality = None
        nationality_keywords = ['Quoc tich', 'Quốc tịch', 'Nationality']
        stop_keywords_nationality = ['Quequan', 'Place of origin', 'Quê quán']
        
        for keyword in nationality_keywords:
            idx = full_text.find(keyword)
            if idx != -1:
                after_keyword = full_text[idx + len(keyword):].strip()
                after_keyword = re.sub(r'^[/:\-\.\s:]+', '', after_keyword)
                
                stop_idx = len(after_keyword)
                for stop_kw in stop_keywords_nationality:
                    stop_pos = after_keyword.find(stop_kw)
                    if stop_pos != -1 and stop_pos < stop_idx:
                        stop_idx = stop_pos
                
                nationality_text = after_keyword[:stop_idx].strip()
                parts = nationality_text.split()
                if parts:
                    nationality = parts[0].strip()
                    if len(parts) >= 2 and parts[0].lower() in ['viet', 'việt']:
                        nationality = ' '.join(parts[:2])
                    if nationality:
                        print(f"Tìm thấy quốc tịch: {nationality}")
                        break
        
        if not nationality:
            if 'Viet Nam' in full_text or 'VIET NAM' in full_text or 'Việt Nam' in full_text:
                nationality = 'Việt Nam'
                print(f"Tìm thấy quốc tịch: {nationality}")
        
        date_of_expiry = None
        
        # Tìm tất cả các pattern ngày tháng trong text
        date_patterns = [
            r'\d{2}/\d{2}/\d{4}',
            r'\d{2}-\d{2}-\d{4}',
            r'\d{1,2}/\d{1,2}/\d{4}',
            r'\d{1,2}-\d{1,2}-\d{4}',
        ]
        
        all_dates = []
        for pattern in date_patterns:
            matches = re.finditer(pattern, full_text)
            for match in matches:
                all_dates.append({
                    'date': match.group(),
                    'position': match.start(),
                    'text_around': full_text[max(0, match.start()-30):min(len(full_text), match.end()+30)]
                })
        
        # Ưu tiên 1: Tìm theo keyword
        expiry_keywords = [
            'Co giatrj', 'Có giá trị', 'Date of expiry', 'Ngày hết hạn', 
            'Date of expiration', 'Co giatrjdn', 'Có giá trị đến',
            'Co giatrj den', 'Có giá trị đến', 'Co giatrj den:',
            'expiry', 'hết hạn', 'giatrj', 'giá trị'
        ]
        
        for keyword in expiry_keywords:
            idx = full_text.find(keyword)
            if idx != -1:
                # Tìm ngày gần nhất sau keyword (trong vòng 100 ký tự)
                after_keyword = full_text[idx + len(keyword):idx + len(keyword) + 100]
                date_match = re.search(r'\d{2}/\d{2}/\d{4}|\d{2}-\d{2}-\d{4}|\d{1,2}/\d{1,2}/\d{4}|\d{1,2}-\d{1,2}/\d{4}', after_keyword)
                if date_match:
                    date_of_expiry = date_match.group()
                    print(f"Tìm thấy ngày hết hạn (từ keyword '{keyword}'): {date_of_expiry}")
                    break
        
        # Ưu tiên 2: Nếu không tìm thấy qua keyword, tìm ngày ở phần cuối của text
        # (ngày hết hạn thường ở cuối CCCD)
        if not date_of_expiry and all_dates:
            # Sắp xếp theo vị trí (từ cuối lên)
            all_dates.sort(key=lambda x: x['position'], reverse=True)
            
            # Lấy ngày ở vị trí cuối cùng (hoặc gần cuối)
            # Thường ngày hết hạn là ngày thứ 2 hoặc 3 từ cuối (sau ngày sinh)
            if len(all_dates) >= 2:
                # Bỏ qua ngày đầu tiên (có thể là ngày sinh), lấy ngày thứ 2
                candidate = all_dates[1] if len(all_dates) > 1 else all_dates[0]
                
                # Kiểm tra xem có phải ngày hợp lệ không (năm >= 2020 thường là ngày hết hạn)
                date_str = candidate['date']
                year_match = re.search(r'/(\d{4})|(\d{4})$', date_str)
                if year_match:
                    year = int(year_match.group(1) or year_match.group(2))
                    if year >= 2020:  # Ngày hết hạn thường từ 2020 trở đi
                        date_of_expiry = date_str
                        print(f"Tìm thấy ngày hết hạn (từ vị trí cuối, năm {year}): {date_of_expiry}")
            
            # Nếu vẫn chưa có, lấy ngày cuối cùng
            if not date_of_expiry and all_dates:
                date_of_expiry = all_dates[0]['date']
                print(f"Tìm thấy ngày hết hạn (ngày cuối cùng trong text): {date_of_expiry}")
        
        if not date_of_expiry:
            print("Không tìm thấy ngày hết hạn")
            print(f"Tất cả các ngày tìm được: {[d['date'] for d in all_dates]}")
        
        expiry_status = None
        expiry_message = None
        if date_of_expiry:
            try:
                from datetime import datetime
                if '/' in date_of_expiry:
                    expiry_date = datetime.strptime(date_of_expiry, '%d/%m/%Y')
                else:
                    expiry_date = datetime.strptime(date_of_expiry, '%d-%m-%Y')
                
                now = datetime.now()
                if expiry_date >= now:
                    days_remaining = (expiry_date - now).days
                    expiry_status = 'valid'
                    expiry_message = f"CCCD còn hạn. Còn {days_remaining} ngày (hết hạn: {date_of_expiry})"
                    print(expiry_message)
                else:
                    days_expired = (now - expiry_date).days
                    expiry_status = 'expired'
                    expiry_message = f"CCCD đã hết hạn. Đã hết hạn {days_expired} ngày (hết hạn: {date_of_expiry})"
                    print(expiry_message)
            except Exception as e:
                print(f"Lỗi khi kiểm tra ngày hết hạn: {e}")
                expiry_status = 'unknown'
                expiry_message = f"Không thể kiểm tra ngày hết hạn: {date_of_expiry}"
        
        date_of_issue = None
        place_of_issue = None
        place_of_origin = None
        place_of_residence = None
        
        return {
            'id_number': id_number,
            'name': name,
            'date_of_birth': dob,
            'gender': gender,
            'nationality': nationality,
            'date_of_expiry': date_of_expiry,
            'expiry_status': expiry_status,
            'expiry_message': expiry_message,
            'date_of_issue': None,
            'place_of_issue': None,
            'place_of_origin': None,
            'place_of_residence': None,
            'full_text': full_text,
            'ocr_results': ocr_data,
            'raw_text': all_text
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
    
    print("\nĐang khởi tạo PaddleOCR (lần đầu có thể mất vài phút để download model)...")
    try:
        ocr_reader = PaddleOCR(use_angle_cls=True, lang='vi', use_gpu=False)
        print("PaddleOCR đã sẵn sàng!\n")
    except Exception as e:
        print(f"Lỗi khởi tạo PaddleOCR: {e}")
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
