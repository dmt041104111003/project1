import face_recognition

def face_recognize(img_card_path, img_scan_array):
    img_card = face_recognition.load_image_file(img_card_path)
    img_scan = img_scan_array

    encodings_card = face_recognition.face_encodings(img_card)
    encodings_scan = face_recognition.face_encodings(img_scan)

    if not encodings_card:
        print("Không tìm thấy khuôn mặt trong ảnh giấy tờ.")
        return False

    if not encodings_scan:
        print("Không tìm thấy khuôn mặt trong ảnh chụp.")
        return False

    embedding_card = encodings_card[0]
    embedding_scan = encodings_scan[0]

    distance = face_recognition.face_distance([embedding_card], embedding_scan)[0]
    print(f"Khoảng cách giữa hai khuôn mặt: {distance:.4f}")

    match = distance <= 0.6
    return match

