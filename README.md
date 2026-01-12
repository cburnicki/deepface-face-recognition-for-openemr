# Face Recognition Service

Patient identification via face recognition. Upload patient photos, then identify them later using webcam captures.

Built on [DeepFace](https://github.com/serengil/deepface) - a lightweight Python face recognition API.

## Quick Start

### Standalone Mode

For standalone development/testing:

```bash
docker compose -f docker-compose.standalone.yml up -d
```

### With OpenEMR

To connect to a locally running OpenEMR instance (joins the `openemr` Docker network):

```bash
docker compose -f docker-compose.openemr.yml up -d
```

> **Note:** OpenEMR must be running first. You may need to update the network name in `docker-compose.openemr.yml` to match your OpenEMR setup. Find your network name with `docker network ls`.

### Test App

```bash
cd test-app
npm install
npm start
```

- **DeepFace API:** http://localhost:5005
- **Test App:** http://localhost:3456

## Project Structure

```
├── docker-compose.standalone.yml  # Standalone (no external networks)
├── docker-compose.openemr.yml     # Joins OpenEMR Docker network
├── docker-compose.prod.yml        # Linux production deployment
├── .env.example                   # Optional config
└── test-app/                      # Web UI for testing
    ├── server.js                  # Express API (stores embeddings in memory)
    └── public/index.html          # Register & search faces via webcam
```

## Test App Features

| Tab | Description |
|-----|-------------|
| **Register** | Capture/upload photo + name → stores face embedding |
| **Search** | Capture/upload photo → shows matches ranked by similarity |
| **List** | View all registered people |

Data is stored in memory only - resets when server restarts.

## Configuration

Copy `.env.example` to `.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPFACE_PORT` | 5005 | API port |
| `CUDA_VISIBLE_DEVICES` | -1 | GPU (-1 = CPU only) |

## Production (Linux)

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## API Reference

### Get Face Embedding

```bash
curl -X POST http://localhost:5005/represent \
  -H "Content-Type: application/json" \
  -d '{"img": "data:image/jpeg;base64,...", "model_name": "Facenet512"}'
```

### Verify Two Faces

```bash
curl -X POST http://localhost:5005/verify \
  -H "Content-Type: application/json" \
  -d '{"img1": "photo1.jpg", "img2": "photo2.jpg", "model_name": "Facenet512"}'
```

### Analyze Face (age, gender, emotion)

```bash
curl -X POST http://localhost:5005/analyze \
  -H "Content-Type: application/json" \
  -d '{"img": "photo.jpg"}'
```

## Model Selection

Always pass `"model_name": "Facenet512"` - it performs best for Asian faces. Default is `VGG-Face` if omitted.

| Model | Accuracy | Speed | Notes |
|-------|----------|-------|-------|
| `Facenet512` | High | Medium | **Recommended** |
| `ArcFace` | High | Medium | Good for large databases |
| `VGG-Face` | Medium | Fast | Default |
| `SFace` | Medium | Fast | Lightweight |

Models download on first use and are cached in the Docker volume.

## Similarity Threshold

API returns similarity scores (0-1). Implement threshold in your app:
- **≥ 0.6** = likely match (green in test app)
- **0.4-0.6** = uncertain (yellow)
- **< 0.4** = no match (red)
