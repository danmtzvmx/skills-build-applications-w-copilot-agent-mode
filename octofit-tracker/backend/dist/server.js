import express from 'express';
const app = express();
const PORT = Number(process.env.PORT) || 8000;
app.use(express.json());
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'octofit-tracker-backend' });
});
app.listen(PORT, () => {
    console.log(`OctoFit Tracker backend running on http://localhost:${PORT}`);
});
