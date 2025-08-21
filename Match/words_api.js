const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const WORDS_DIR = path.join(__dirname, 'words');

// 获取words目录下的所有Excel文件列表
router.get('/list', (req, res) => {
  fs.readdir(WORDS_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: '无法读取文件夹' });
    }
    // 只返回xlsx/xls文件
    const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    res.json(excelFiles);
  });
});

// 获取指定Excel文件内容，返回配对数组
router.get('/get', (req, res) => {
  const file = req.query.file;
  if (!file) return res.status(400).json({ error: '缺少文件名参数' });
  const filePath = path.join(WORDS_DIR, file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件不存在' });
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { 
        header: 1,  // 第一行就是数据行
        raw: false, // 保留文本格式（如百分数显示为"50%"）
        defval: ""  // 空单元格默认值
    });
    // 假设每行前两列为配对
    const pairs = data
      .filter(row => row[0] && row[1])
      .map(row => ({ left: row[0], right: row[1] }));
    res.json(pairs);
  } catch (e) {
    res.status(500).json({ error: '读取Excel失败' });
  }
});

module.exports = router; 