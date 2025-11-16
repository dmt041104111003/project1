FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    build-essential \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libboost-python-dev \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only requirements first for better caching
COPY Code/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only necessary files (exclude training files, logs, etc.)
COPY Code/apiCall_Fake_Real.py .
COPY Code/my_test.py .
COPY Code/anti_spoof_predict.py .
COPY Code/embedding_faceCard_faceScan.py .
COPY Code/utils.py .
COPY Code/utility.py .
COPY Code/model_lib/ ./model_lib/
COPY Code/data_io/ ./data_io/
COPY Code/generate_patches.py .

# Create resources directory and copy models
RUN mkdir -p ./resources/anti_spoof_models ./resources/detection_model
COPY resources/anti_spoof_models/*.pth ./resources/anti_spoof_models/
COPY resources/detection_model/* ./resources/detection_model/

EXPOSE 5000

ENV FLASK_APP=apiCall_Fake_Real.py
ENV FLASK_ENV=production

CMD ["python", "apiCall_Fake_Real.py"] 