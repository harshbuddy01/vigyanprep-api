import express from 'express';
// Native fetch is available in Node 18+

const router = express.Router();

// GET /api/news
router.get('/', async (req, res) => {
    try {
        const { category = 'science', language = 'en', pageSize = 50, page = 1 } = req.query;

        const API_KEY = process.env.NEWS_API_KEY;
        if (!API_KEY) {
            console.error('❌ News API Key is missing');
            return res.status(500).json({
                status: 'error',
                message: 'Server configuration error: News API Key missing'
            });
        }

        const url = `https://newsapi.org/v2/top-headlines?category=${category}&language=${language}&pageSize=${pageSize}&page=${page}&apiKey=${API_KEY}`;

        console.log(`fetching news from: ${url.replace(API_KEY, 'HIDDEN')}`);

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            res.json(data);
        } else {
            console.error('News API Error:', data);
            res.status(response.status).json(data);
        }
    } catch (error) {
        console.error('❌ Error fetching news:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch news',
            error: error.message
        });
    }
});

export default router;
