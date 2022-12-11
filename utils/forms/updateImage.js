// Get local image filepath from database, a previous upload, or create a new one based on multer file upload. Because of ephemeral storage on cloud hosting providers, the local image path saved to the database may or may not still exist.

const fs = require('fs');

function updateImage(prevPath, uploadedFile) {
  let imagePath;
  let updated = false;

  if (prevPath && uploadedFile == undefined) {
    // Previous image is being kept
    imagePath = prevPath;
  } else if (prevPath && uploadedFile) {
    // Image is being replaced
    imagePath = uploadedFile.filename;
    updated = true;
  } else if (!prevPath && uploadedFile == undefined) {
    // No file and nothing uploaded (there is an error message defined for this in the controllers)
    imagePath = '';
  } else {
    // No loaded (previewed) file but new uploaded file
    imagePath = uploadedFile.filename;
    updated = true;
  }
  // Because of ephemeral file storage, the path to the local image may or may not point to an existant file
  const exists = fs.existsSync(`public/images/${imagePath}`);

  return { path: imagePath, updated, exists };
}

module.exports = updateImage;
