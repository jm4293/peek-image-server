require('dotenv').config();

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const SAVE_DIR = ['o', 'r'];

SAVE_DIR.forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
    origin: '*',
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, SAVE_DIR[0]);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);

            const randomName = crypto.randomBytes(32).toString('hex');

            cb(null, `${randomName}${ext}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.jpg', '.jpeg', '.png'];

        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    },
});

app.post('/', (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: '파일 업로드 오류', error: err.message });
        } else if (err) {
            return res.status(500).json({ message: '서버 오류', error: err.message });
        }

        console.log('파일 업로드 성공:', req.file);

        res.json({
            // message: '파일이 성공적으로 저장되었습니다.',
            name: req.file.filename.split('.')[0],
            mimetype: req.file.mimetype,
        });
    });
});

app.get('/', async (req, res) => {
    const { name, width = 200 } = req.query;

    if (!name) {
        return res.status(400).json({ message: 'name 쿼리가 필요합니다.' });
    }

    const parsed = path.parse(name);
    const resizedFileName = `${parsed.name}_${width}.webp`;
    const resizedFilePath = path.join(SAVE_DIR[1], resizedFileName);

    if (fs.existsSync(resizedFilePath)) {
        res.set('Content-Type', 'image/webp');
        return res.sendFile(path.resolve(resizedFilePath));
    }

    const baseName = path.parse(name).name;
    const files = fs.readdirSync(SAVE_DIR[0]);
    const originalFile = files.find((f) => path.parse(f).name === baseName);

    if (!originalFile) {
        return res.status(404).json({ message: '원본 파일이 존재하지 않습니다.' });
    }

    const originalFilePath = path.join(SAVE_DIR[0], originalFile);

    try {
        await sharp(originalFilePath)
            .resize(parseInt(width, 10), null, { fit: 'inside' })
            .toFormat('webp')
            .toFile(resizedFilePath);

        res.set('Content-Type', 'image/webp');
        res.sendFile(path.resolve(resizedFilePath));
    } catch (err) {
        res.status(500).json({ message: '이미지 리사이즈 중 오류가 발생했습니다.' });
    }
});

app.listen(port, () => {
    console.log(`image server ${port} 에서 실행 중입니다.`);
}).on('error', (err) => {
    console.error('서버 시작 중 오류가 발생했습니다:', err);
});
