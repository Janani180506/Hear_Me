# FastAPI backend for the trained gesture CNN

Run the server with:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Send an image to:

```bash
curl -X POST "http://localhost:8000/predict" -F "file=@/path/to/image.jpg"
```
