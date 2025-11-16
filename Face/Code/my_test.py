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
    

    #image = cv2.imread(image_name)
    # if image is None:
    #     print(f"Error: Cannot read image: {image_name}")
    #     return
    
    # Resize ảnh theo yêu cầu (3:4)
    image = cv2.resize(image, (int(image.shape[0] * 3 / 4), image.shape[0]))
    
    result = check_image(image)
    if result is False:
        return
    
    image_bbox = model_test.get_bbox(image)
    prediction = np.zeros((1, 3))
    test_speed = 0
    
    for model_name in os.listdir(model_dir):
        h_input, w_input, model_type, scale = parse_model_name(model_name)
        param = {
            "org_img": image,
            "bbox": image_bbox,
            "scale": scale,
            "out_w": w_input,
            "out_h": h_input,
            "crop": True,
        }
        if scale is None:
            param["crop"] = False
        img = image_cropper.crop(**param)
        start = time.time()
        prediction += model_test.predict(img, os.path.join(model_dir, model_name))
        test_speed += time.time() - start

    label = np.argmax(prediction)
    value = prediction[0][label] / 2
    print(f"Prediction label: {label}, value: {value}")
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
