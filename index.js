import express from 'express';
import ytdl    from 'ytdl-core';
import cors    from 'cors';

const app = express();
app.use(cors());

// ─── Helpers ────────────────────────────────────────────────────────────────

// Extrae sólo el ID de YouTube y reconstruye la URL limpia.
function normalizeYouTubeUrl(raw) {
  try {
    const u = new URL(raw);
    let id = null;
    if (u.hostname.includes('youtube.com')) {
      id = u.searchParams.get('v');
    } else if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1);
    }
    if (!id) return null;
    return `https://www.youtube.com/watch?v=${id}`;
  } catch {
    return null;
  }
}

// ─── Endpoints ─────────────────────────────────────────────────────────────

// Ping / healthcheck
app.get('/', (_req, res) => res.sendStatus(200));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Video info (igual que antes)
app.get('/info', async (req, res) => {
  const raw = req.query.url;
  const url = normalizeYouTubeUrl(raw);
  if (!url) return res.status(400).send('Invalid url');

  if (!ytdl.validateURL(url)) {
    return res.status(400).send('Invalid url');
  }
  try {
    const info = (await ytdl.getInfo(url)).videoDetails;
    const title     = info.title;
    const thumbnail = info.thumbnails[2]?.url;
    res.json({ title, thumbnail });
  } catch (err) {
    console.error('[/info] error:', err.message);
    res.status(500).send('Error fetching info');
  }
});

// MP3 download (igual que antes)
app.get('/mp3', async (req, res) => {
  const raw = req.query.url;
  const url = normalizeYouTubeUrl(raw);
  if (!url) return res.status(400).send('Invalid url');

  if (!ytdl.validateURL(url)) {
    return res.status(400).send('Invalid url');
  }
  try {
    const videoName = (await ytdl.getInfo(url)).videoDetails.title;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${videoName}.mp3"`
    );
    res.setHeader('Content-Type', 'audio/mpeg');
    ytdl(url, { quality: 'highestaudio', filter: 'audioonly' }).pipe(res);
  } catch (err) {
    console.error('[/mp3] error:', err.message);
    res.status(500).send('Error streaming audio');
  }
});

// MP4 download (limpia URL para evitar el 410)
app.get('/mp4', async (req, res) => {
  const raw = req.query.url;
  const url = normalizeYouTubeUrl(raw);
  if (!url) return res.status(400).send('Invalid url');

  if (!ytdl.validateURL(url)) {
    return res.status(400).send('Invalid url');
  }
  try {
    const info      = await ytdl.getInfo(url);
    const title     = info.videoDetails.title.replace(/[^a-zA-Z0-9 _-]/g, '');
    const filename  = `${title}.mp4`;

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.setHeader('Content-Type', 'video/mp4');

    // calidad más alta mp4
    ytdl(url, { quality: 'highest', filter: 'audioandvideo' }).pipe(res);
  } catch (err) {
    console.error('[/mp4] error:', err.message);
    res.status(500).send('Error streaming video');
  }
});

// ─── Arranque ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3500;
app.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
});
