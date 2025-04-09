require('dotenv').config();

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// 필요한 폴더 목록
const requiredDirectories = ['original_images', 'resized_images'];

// 서버 시작 시 필요한 폴더 생성
requiredDirectories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`폴더 생성: ${dir}`);
  }
});

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: '*',
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'original_images');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const randomName = crypto.randomBytes(32).toString('hex');

    cb(null, `${randomName}${ext}`);
  },
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('image'), async (req, res) => {
  const { width, height } = req.body;

  if (!width || !height) {
    return res.status(400).send('width와 height는 필수 값입니다.');
  }

  try {
    const originalPath = path.join('original_images', req.file.filename);

    const resizedPath = path.join('resized_images', `${path.parse(req.file.filename).name}.webp`);

    if (!fs.existsSync(path.dirname(resizedPath))) {
      fs.mkdirSync(path.dirname(resizedPath), { recursive: true });
    }

    fs.renameSync(req.file.path, originalPath);

    await sharp(originalPath)
      .resize(parseInt(width), parseInt(height), { fit: 'inside' })
      .toFormat('webp')
      .toFile(resizedPath);

    res.json({ resizedImageUrl: `/resized_images/${path.basename(resizedPath)}` });
  } catch (error) {
    console.error('이미지 업로드 및 리사이징 중 오류가 발생했습니다:', error);
    res.status(500).send('이미지 업로드 및 리사이징 중 오류가 발생했습니다.');
  }
});

app.use('/download/resized_images', express.static('resized_images'));

app
  .listen(port, () => {
    console.log(`image server ${port} 에서 실행 중입니다.`);
  })
  .on('error', (err) => {
    console.error('서버 시작 중 오류가 발생했습니다:', err);
  });
