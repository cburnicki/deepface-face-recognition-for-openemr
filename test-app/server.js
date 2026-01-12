const express = require('express');
const path = require('path');

const app = express();
const PORT = 3456;

// Store registered people in memory (resets on restart)
const people = [];

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API: Get all registered people
app.get('/api/people', (req, res) => {
  res.json(people.map(p => ({ id: p.id, name: p.name, photo: p.photo })));
});

// API: Register a new person
app.post('/api/register', async (req, res) => {
  const { name, photo } = req.body;

  if (!name || !photo) {
    return res.status(400).json({ error: 'Name and photo are required' });
  }

  try {
    // Get face embedding from DeepFace
    const response = await fetch('http://localhost:5005/represent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        img: photo,
        model_name: 'Facenet512'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.error || 'Failed to process face' });
    }

    if (!data.results || data.results.length === 0) {
      return res.status(400).json({ error: 'No face detected in image' });
    }

    const person = {
      id: Date.now().toString(),
      name,
      photo,
      embedding: data.results[0].embedding
    };

    people.push(person);
    res.json({ success: true, id: person.id, name: person.name });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to connect to DeepFace service' });
  }
});

// API: Search for a face
app.post('/api/search', async (req, res) => {
  const { photo } = req.body;

  if (!photo) {
    return res.status(400).json({ error: 'Photo is required' });
  }

  if (people.length === 0) {
    return res.json({ matches: [], message: 'No people registered yet' });
  }

  try {
    // Get face embedding from DeepFace
    const response = await fetch('http://localhost:5005/represent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        img: photo,
        model_name: 'Facenet512'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.error || 'Failed to process face' });
    }

    if (!data.results || data.results.length === 0) {
      return res.status(400).json({ error: 'No face detected in image' });
    }

    const searchEmbedding = data.results[0].embedding;

    // Compare with all registered people using cosine similarity
    const matches = people.map(person => {
      const similarity = cosineSimilarity(searchEmbedding, person.embedding);
      return {
        id: person.id,
        name: person.name,
        photo: person.photo,
        similarity: Math.round(similarity * 1000) / 1000
      };
    });

    // Sort by similarity (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);

    res.json({ matches });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to connect to DeepFace service' });
  }
});

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

app.listen(PORT, () => {
  console.log(`Test app running at http://localhost:${PORT}`);
  console.log('Make sure DeepFace is running at http://localhost:5005');
});
