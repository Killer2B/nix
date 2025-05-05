const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = process.env.PORT || 3000;

// إعدادات الوسيط
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// مسار التحقق من صحة الرابط
app.post('/api/validate', async (req, res) => {
    try {
        const { url, platform } = req.body;
        let videoInfo = null;

        switch (platform) {
            case 'youtube':
                videoInfo = await ytdl.getInfo(url);
                res.json({
                    valid: true,
                    info: {
                        title: videoInfo.videoDetails.title,
                        duration: videoInfo.videoDetails.lengthSeconds,
                        thumbnail: videoInfo.videoDetails.thumbnails[0].url,
                        author: videoInfo.videoDetails.author.name,
                        views: videoInfo.videoDetails.viewCount,
                        formats: videoInfo.formats.map(format => ({
                            quality: format.qualityLabel || 'صوت فقط',
                            size: format.contentLength ? `${(format.contentLength / 1024 / 1024).toFixed(2)} MB` : 'غير معروف',
                            format: format.container,
                            url: format.url
                        }))
                    }
                });
                break;

            case 'facebook':
                // استخدام axios للحصول على معلومات الفيديو
                const response = await axios.get(url);
                const $ = cheerio.load(response.data);
                const title = $('meta[property="og:title"]').attr('content');
                const thumbnail = $('meta[property="og:image"]').attr('content');
                
                res.json({
                    valid: true,
                    info: {
                        title: title || 'Facebook Video',
                        thumbnail: thumbnail,
                        formats: [{
                            quality: 'HD',
                            format: 'mp4',
                            url: url
                        }]
                    }
                });
                break;

            case 'tiktok':
                // استخدام axios للحصول على معلومات الفيديو
                const tiktokResponse = await axios.get(url);
                const tiktokData = tiktokResponse.data;
                
                res.json({
                    valid: true,
                    info: {
                        title: 'TikTok Video',
                        formats: [{
                            quality: 'HD',
                            format: 'mp4',
                            url: url
                        }]
                    }
                });
                break;

            default:
                res.status(400).json({ error: 'منصة غير مدعومة' });
        }
    } catch (error) {
        res.status(400).json({ error: 'رابط غير صالح' });
    }
});

// مسار التحميل
app.post('/api/download', async (req, res) => {
    try {
        const { url, format, quality, platform } = req.body;
        
        switch (platform) {
            case 'youtube':
                ytdl(url, {
                    quality: quality,
                    format: format
                }).pipe(res);
                break;

            case 'facebook':
            case 'tiktok':
                const videoResponse = await axios({
                    method: 'GET',
                    url: url,
                    responseType: 'stream'
                });
                videoResponse.data.pipe(res);
                break;

            default:
                res.status(400).json({ error: 'منصة غير مدعومة' });
        }
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ أثناء التحميل' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
