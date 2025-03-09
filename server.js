require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
};

app.use(cors(corsOptions));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    cb(null, `${file.fieldname}-${Date.now()}_${formattedDate}${ext}`);
  },
});

const upload = multer({ storage: storage });

const originalDir = 'original_images';
const resizedDir = 'resized_images';

if (!fs.existsSync(originalDir)) {
  fs.mkdirSync(originalDir);
}

if (!fs.existsSync(resizedDir)) {
  fs.mkdirSync(resizedDir);
}

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const originalPath = path.join(originalDir, req.file.filename);
    const resizedPath = path.join(resizedDir, `resized-${path.parse(req.file.filename).name}.webp`);

    fs.renameSync(req.file.path, originalPath);

    await sharp(originalPath).resize(300, 300).toFormat('webp').toFile(resizedPath);

    res.json({ resizedImageUrl: `/image/${path.basename(resizedPath)}` });
  } catch (error) {
    res.status(500).send('이미지 업로드 및 리사이징 중 오류가 발생했습니다.');
  }
});

app.use('/image', express.static(resizedDir));

app.listen(port, () => {
  console.log(`image server ${port} 에서 실행 중입니다.`);
});
