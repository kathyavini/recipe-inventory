// Get image path from a previous upload, or create a new one based on multer file upload. Also cleans up (deletes) the image file that is being replaced

// The image in prevPath is shown in the form views under Image Preview

const fs = require('fs');

function updateImage(prevPath, uploadedFile) {
  let imagePath;

  if (prevPath && uploadedFile == undefined) {
    // Previous image is being kept
    imagePath = prevPath;
  } else if (prevPath && uploadedFile) {
    // Image is being replaced
    imagePath = uploadedFile.filename;
    // Delete previous image
    fs.unlink(`public/images/${prevPath}`, (err) => {
      if (err) {
        // Don't pass to next() if this errors; just console.log it
        console.log(err);
      }
      console.log('Deleting previous upload: ' + prevPath);
    });
  } else if (!prevPath && uploadedFile == undefined) {
    // No file and nothing uploaded (there is an error message defined for this in the controllers)
    imagePath = '';
  } else {
    // No loaded file but new uploaded file
    imagePath = uploadedFile.filename;
  }
  return imagePath;
}

module.exports = updateImage;
