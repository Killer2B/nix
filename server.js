const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const fbvideos = require('fb-video-downloader');
const TikTokScraper = require('tiktok-scraper');
const app = express();
const port = 3000;

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
                videoInfo = await fbvideos.getInfo(url);
                res.json({
                    valid: true,
                    info: {
                        title: videoInfo.title,
                        thumbnail: videoInfo.thumbnail,
                        formats: videoInfo.formats
                    }
                });
                break;

            case 'tiktok':
                videoInfo = await TikTokScraper.getVideoMeta(url);
                res.json({
                    valid: true,
                    info: {
                        title: videoInfo.text,
                        author: videoInfo.authorMeta.name,
                        thumbnail: videoInfo.imageUrl,
                        formats: [{
                            quality: 'عالية',
                            url: videoInfo.videoUrl
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
        const { url, format, quality } = req.body;
        
        // إعداد رأس الاستجابة للتحميل
        res.header('Content-Disposition', `attachment; filename="video.${format}"`);
        
        switch (req.body.platform) {
            case 'youtube':
                ytdl(url, {
                    quality: quality,
                    format: format
                }).pipe(res);
                break;

            case 'facebook':
                // معالجة تحميل فيديو فيسبوك
                const fbVideo = await fbvideos.download(url, quality);
                res.redirect(fbVideo.url);
                break;

            case 'tiktok':
                // معالجة تحميل فيديو تيك توك
                const tiktokVideo = await TikTokScraper.video(url);
                res.redirect(tiktokVideo.videoUrl);
                break;

            default:
                res.status(400).json({ error: 'منصة غير مدعومة' });
        }
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ أثناء التحميل' });
    }
});

// تشغيل السيرفر
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
