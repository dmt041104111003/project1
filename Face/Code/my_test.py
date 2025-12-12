# -*- coding: utf-8 -*-
# @Time : 20-6-9 下午3:06
# @Author : zhuying
# @Company : Minivision
# @File : test.py
# @Software : PyCharm

import os
import cv2
import numpy as np
import argparse
import warnings
import time

from anti_spoof_predict import AntiSpoofPredict
from generate_patches import CropImage
from utility import parse_model_name
warnings.filterwarnings('ignore')


SAMPLE_IMAGE_PATH = ""



def check_image(image):
    height, width, channel = image.shape
    if width/height != 3/4:
        print("Image is not appropriate!!!\nHeight/Width should be 4/3.")
        return False
    else:
        return True


def test(image, model_dir, device_id):
    model_test = AntiSpoofPredict(device_id)
    image_cropper = CropImage()
    
    original_image = image.copy()
    image_bbox = model_test.get_bbox(original_image)
    if image_bbox is None or len(image_bbox) != 4:
        print("Failed to detect face!")
        return None
    
    x, y, w, h = image_bbox
    x2 = x + w
    y2 = y + h
    
    if w <= 0 or h <= 0:
        print(f"Invalid bbox! width={w}, height={h} must be > 0")
        return None
    
    if x < 0 or y < 0 or x2 > original_image.shape[1] or y2 > original_image.shape[0]:
        print(f"Bbox out of bounds! Image shape: {original_image.shape}, bbox: {image_bbox}")
        x = max(0, x)
        y = max(0, y)
        x2 = min(original_image.shape[1], x2)
        y2 = min(original_image.shape[0], y2)
        w = x2 - x
        h = y2 - y
        image_bbox = [x, y, w, h]
        print(f"Clamped bbox to: {image_bbox}")
    
    img_height, img_width = original_image.shape[0], original_image.shape[1]
    face_area_ratio = (w * h) / (img_width * img_height)
    
    print(f"Detected face bbox: {image_bbox} (x={x}, y={y}, w={w}, h={h}, x2={x2}, y2={y2})")
    print(f"Face area ratio: {face_area_ratio:.2%}")
    
    if face_area_ratio < 0.05:
        print(f"WARNING: Face very small ({face_area_ratio:.2%}). Model may be less accurate, but continuing...")
    elif face_area_ratio > 0.80:
        print(f"WARNING: Face very large ({face_area_ratio:.2%}). Model may be less accurate, but continuing...")
    
    face_roi = original_image[y:y2, x:x2]
    gray_roi = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray_roi)
    
    if mean_brightness < 50:
        face_roi = cv2.convertScaleAbs(face_roi, alpha=1.3, beta=30)
        print(f"Enhanced brightness (was {mean_brightness:.1f})")
    elif mean_brightness > 200:
        face_roi = cv2.convertScaleAbs(face_roi, alpha=0.8, beta=-20)
        print(f"Reduced brightness (was {mean_brightness:.1f})")
    
    enhanced_image = original_image.copy()
    enhanced_image[y:y2, x:x2] = face_roi
    
    prediction = np.zeros((1, 3))
    test_speed = 0
    model_count = 0
    
    print(f"Original image stats: min={original_image.min()}, max={original_image.max()}, dtype={original_image.dtype}")
    
    for model_name in os.listdir(model_dir):
        if not model_name.endswith('.pth'):
            continue
            
        h_input, w_input, model_type, scale = parse_model_name(model_name)
        print(f"Processing model: {model_name}, scale: {scale}, output size: {w_input}x{h_input}")
        
        param = {
            "org_img": enhanced_image,
            "bbox": image_bbox,
            "scale": scale,
            "out_w": w_input,
            "out_h": h_input,
            "crop": True,
        }
        if scale is None:
            param["crop"] = False
        
        img = image_cropper.crop(**param)
        print(f"Cropped patch shape: {img.shape}, min={img.min()}, max={img.max()}")
        
        start = time.time()
        pred = model_test.predict(img, os.path.join(model_dir, model_name))
        print(f"Model {model_name} prediction: {pred[0]}")
        prediction += pred
        test_speed += time.time() - start
        model_count += 1

    if model_count == 0:
        print("No models found in model_dir!")
        return None
    
    prediction = prediction / model_count

    label = np.argmax(prediction)
    value = prediction[0][label]
    
    print(f"Final prediction - Label: {label}, Confidence: {value:.4f}")
    print(f"All scores: [REAL={prediction[0][0]:.6f}, PAPER={prediction[0][1]:.6f}, DIGITAL={prediction[0][2]:.6f}]")
    
    real_score = prediction[0][0]
    paper_score = prediction[0][1]
    digital_score = prediction[0][2]
    
    print(f"Model prediction - REAL: {real_score:.6f}, PAPER: {paper_score:.6f}, DIGITAL: {digital_score:.6f}")
    print(f"Original label: {label} (0=REAL, 1=PAPER, 2=DIGITAL)")
    
    # Chỉ accept label 0 (REAL) là thật
    # Label 1 (PAPER) và Label 2 (DIGITAL) đều là spoof
    if label == 0:
        print(f"✅ REAL FACE DETECTED (label={label})")
        return 0
    else:
        spoof_type = "PAPER SPOOF" if label == 1 else "DIGITAL SPOOF"
        print(f"❌ SPOOF DETECTED: {spoof_type} (label={label})")
        return label



if __name__ == "__main__":
    desc = "test"
    parser = argparse.ArgumentParser(description=desc)
    parser.add_argument(
        "--device_id",
        type=int,
        default=0,
        help="which gpu id, [0/1/2/3]")
    parser.add_argument(
        "--model_dir",
        type=str,
        default=r"D:\Face\Silent-Face-Anti-Spoofing-master\Silent-Face-Anti-Spoofing-master\resources\anti_spoof_models",
        help="model_lib used to test")
    parser.add_argument(
        "--image_name",
        type=str,
         default=r"D:/Face/Silent-Face-Anti-Spoofing-master/Silent-Face-Anti-Spoofing-master/images/sample/image_T1.jpg",
        help="image used to test")
    args = parser.parse_args()
    test(args.image_name, args.model_dir, args.device_id)
