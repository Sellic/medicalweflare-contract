const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// 업로드된 파일을 저장할 디렉토리 생성
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// PDF 파일 저장을 위한 multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hospitalName = req.body.hospitalName || 'unknown';
    cb(null, `contract_${hospitalName}_${timestamp}.pdf`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('PDF 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 메인 페이지 서빙
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'contract', 'index.html'));
});

// 관리자 페이지 서빙
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'contract', 'admin.html'));
});

// PDF 파일 업로드 엔드포인트
app.post('/upload-pdf', upload.single('pdf'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'PDF 파일이 업로드되지 않았습니다.' 
      });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      uploadDate: new Date().toISOString()
    };

    console.log('PDF 파일이 성공적으로 저장되었습니다:', fileInfo);

    res.json({
      success: true,
      message: 'PDF 파일이 서버에 성공적으로 저장되었습니다.',
      file: fileInfo
    });

  } catch (error) {
    console.error('PDF 업로드 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 저장된 PDF 파일 목록 조회
app.get('/contracts', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const contractFiles = files
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          uploadDate: stats.mtime.toISOString()
        };
      });

    res.json({
      success: true,
      contracts: contractFiles
    });

  } catch (error) {
    console.error('계약서 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '계약서 목록을 불러오는데 실패했습니다.',
      error: error.message
    });
  }
});

// 특정 PDF 파일 다운로드
app.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '파일을 찾을 수 없습니다.'
      });
    }

    res.download(filePath, filename);

  } catch (error) {
    console.error('파일 다운로드 오류:', error);
    res.status(500).json({
      success: false,
      message: '파일 다운로드에 실패했습니다.',
      error: error.message
    });
  }
});

// 특정 PDF 파일 삭제
app.delete('/delete/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '파일을 찾을 수 없습니다.'
      });
    }

    fs.unlinkSync(filePath);
    console.log(`파일이 삭제되었습니다: ${filename}`);

    res.json({
      success: true,
      message: '파일이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('파일 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '파일 삭제에 실패했습니다.',
      error: error.message
    });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`메인 페이지: http://localhost:${PORT}`);
  console.log(`관리자 페이지: http://localhost:${PORT}/admin`);
  console.log(`PDF 파일은 ${uploadsDir} 디렉토리에 저장됩니다.`);
}); 