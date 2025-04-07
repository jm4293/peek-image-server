require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT | 3000;

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
};

app.use(cors(corsOptions));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
    const uploadPath = path.join('uploads', formattedDate);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    cb(null, `${file.fieldname}-${Date.now()}_${formattedDate}${ext}`);
  },
});

const upload = multer({ storage: storage });

app.post('/upload-image', upload.single('image'), async (req, res) => {
  const { width, height } = req.body;

  if (!width || !height) {
    return res.status(400).send('width와 height는 필수 값입니다.');
  }

  try {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
    const originalPath = path.join('original_images', formattedDate, req.file.filename);
    const resizedPath = path.join(
      'resized_images',
      formattedDate,
      `resized-${path.parse(req.file.filename).name}.webp`,
    );

    if (!fs.existsSync(path.dirname(originalPath))) {
      fs.mkdirSync(path.dirname(originalPath), { recursive: true });
    }

    if (!fs.existsSync(path.dirname(resizedPath))) {
      fs.mkdirSync(path.dirname(resizedPath), { recursive: true });
    }

    fs.renameSync(req.file.path, originalPath);

    await sharp(originalPath)
      .resize(parseInt(width), parseInt(height), { fit: 'inside' })
      .toFormat('webp')
      .toFile(resizedPath);

    res.json({ resizedImageUrl: `/image/${formattedDate}/${path.basename(resizedPath)}` });
  } catch (error) {
    console.error('이미지 업로드 및 리사이징 중 오류가 발생했습니다:', error);
    res.status(500).send('이미지 업로드 및 리사이징 중 오류가 발생했습니다.');
  }
});

app.use('/image', express.static('resized_images'));

app
  .listen(port, () => {
    console.log(`image server ${port} 에서 실행 중입니다.`);
  })
  .on('error', (err) => {
    console.error('서버 시작 중 오류가 발생했습니다:', err);
  });
