FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Models are trained at build time so the image is ready to serve immediately.
RUN python model/train_model.py
EXPOSE 5001
CMD ["python", "app.py"]
