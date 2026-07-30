import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting Minimal Debug Server...');
console.log(`Environment PORT: ${process.env.PORT}`);

app.get('/', (req, res) => {
    res.send('Minimal Server is RUNNING');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', type: 'minimal-server' });
});

app.listen(PORT, () => {
    console.log(`✅ Minimal server running on port ${PORT}`);
});
