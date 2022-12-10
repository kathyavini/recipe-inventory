const multer = require('multer');

// For generating filenames
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// From multer readme: https://github.com/expressjs/multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/');
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});

const imageFilter = (req, file, cb) => {
  const validTypes = ['image/gif', 'image/jpeg', 'image/png'];
  if (validTypes.includes(file.mimetype)) {
    // accept this file
    cb(null, true);
  } else {
    // reject this file
    cb(null, false);
  }
};

const upload = multer({ storage: storage, fileFilter: imageFilter });

module.exports = upload;
