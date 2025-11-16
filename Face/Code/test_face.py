import cv2
import numpy as np
import os
from my_test import test
from deepface import DeepFace

def compare_faces(cccd_image_path, current_face_image_path):
    if not os.path.exists(cccd_image_path):
        print(f"Khong tim thay file: {cccd_image_path}")
        return False
    
    if not os.path.exists(current_face_image_path):
        print(f"Khong tim thay file: {current_face_image_path}")
        return False
    
    try:
        print("Dang so sanh khuon mat...")
        result = DeepFace.verify(
            img1_path=cccd_image_path,
            img2_path=current_face_image_path,
            model_name='ArcFace',
            detector_backend='opencv',
            enforce_detection=True,
            distance_metric='cosine'
        )
        
        verified = result['verified']
        distance = result['distance']
        threshold = result['threshold']
        similarity = 1 - distance
        
        print(f"Distance: {distance:.4f}")
        print(f"Similarity: {similarity:.4f}")
        print(f"Threshold: {threshold:.4f}")
        print(f"Ket qua: {'KHOP' if verified else 'KHONG KHOP'}")
        
        return verified
    except Exception as e:
        print(f"Loi khi so sanh: {e}")
        return False

def capture_from_camera():
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Khong the mo camera!")
        return None
    
    print("Camera da san sang!")
    print("Nhan phim SPACE de chup anh, ESC de thoat")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Khong the doc tu camera!")
            break
        
        cv2.imshow('Nhan SPACE de chup, ESC de thoat', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord(' '):
            cap.release()
            cv2.destroyAllWindows()
            temp_path = "temp_camera_photo.jpg"
            cv2.imwrite(temp_path, frame)
            print("Da chup anh!")
            return temp_path
        elif key == 27:
            cap.release()
            cv2.destroyAllWindows()
            print("Da huy!")
            return None
    
    cap.release()
    cv2.destroyAllWindows()
    return None

def compare_faces_from_camera(cccd_image_path):
    MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../resources/anti_spoof_models'))
    
    if not os.path.exists(cccd_image_path):
        print(f"Khong tim thay file: {cccd_image_path}")
        return False
    
    print("Dang chup anh tu camera...")
    temp_photo_path = capture_from_camera()
    if temp_photo_path is None:
        return False
    
    try:
        img_current_bgr = cv2.imread(temp_photo_path)
        
        print("Dang kiem tra anti-spoofing...")
        is_real = test(
            image=img_current_bgr,
            model_dir=MODEL_DIR,
            device_id=0
        )
        
        print(f"Anti-spoofing result: {is_real} (1=that, 0=gia)")
        
        if is_real != 1:
            print("Khuon mat khong phai la that!")
            if os.path.exists(temp_photo_path):
                os.remove(temp_photo_path)
            return False
        
        print("Khuon mat la that!")
        
        print("Dang so sanh khuon mat...")
        result = DeepFace.verify(
            img1_path=cccd_image_path,
            img2_path=temp_photo_path,
            model_name='ArcFace',
            detector_backend='opencv',
            enforce_detection=True,
            distance_metric='cosine'
        )
        
        verified = result['verified']
        distance = result['distance']
        threshold = result['threshold']
        similarity = 1 - distance
        
        print(f"Distance: {distance:.4f}")
        print(f"Similarity: {similarity:.4f}")
        print(f"Threshold: {threshold:.4f}")
        if similarity < threshold:
            print(f"Similarity qua thap ({similarity:.4f} < {threshold:.4f}), khong khop!")
        print(f"Ket qua: {'KHOP' if verified else 'KHONG KHOP'}")
        
        if os.path.exists(temp_photo_path):
            os.remove(temp_photo_path)
        
        return verified
    except Exception as e:
        print(f"Loi khi so sanh: {e}")
        if os.path.exists(temp_photo_path):
            os.remove(temp_photo_path)
        return False

def main():
    cccd_path = r"E:\New folder\web2.5Freelancer\Face\cccd2.jpg"
    
    print("Dang khoi tao DeepFace (lan dau co the mat vai phut de download model)...")
    try:
        print("DeepFace da san sang!\n")
    except Exception as e:
        print(f"Loi khoi tao DeepFace: {e}")
        return
    
    print("Chon che do:")
    print("1. Chup anh tu camera")
    print("2. Doc anh tu file")
    choice = input().strip()
    
    if choice == "1":
        result = compare_faces_from_camera(cccd_path)
        print(f"\nKet qua so khop: {result}")
    elif choice == "2":
        print("Nhap duong dan anh khuon mat hien tai:")
        current_face_path = input().strip()
        
        if not current_face_path:
            print("Khong co duong dan anh!")
            return
        
        result = compare_faces(cccd_path, current_face_path)
        print(f"\nKet qua so khop: {result}")
    else:
        print("Lua chon khong hop le!")

if __name__ == "__main__":
    main()
