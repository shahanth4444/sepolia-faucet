import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// In development, use Vite dev server
if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
    });

    app.use(vite.middlewares);
} else {
    // In production, serve built files
    app.use(express.static(join(__dirname, 'dist')));

    app.get('*', (req, res) => {
        res.sendFile(join(__dirname, 'dist', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Health check available at http://localhost:${PORT}/health`);
});
