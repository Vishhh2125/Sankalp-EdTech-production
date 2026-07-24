const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = 'c:/Users/paras/OneDrive/Desktop/post_7k/alphamind/Sankalp-OTT/frontend-admin/src';

walkDir(targetDir, function(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // For nav.js
    if (filePath.endsWith('nav.js')) {
      content = content.replace(/'Drama \/ Content'/g, "'Course / Content'");
    }
    
    // JSX tags
    content = content.replace(/>Drama</g, '>Course<');
    content = content.replace(/>Dramas</g, '>Courses<');
    content = content.replace(/>drama</g, '>course<');
    content = content.replace(/>dramas</g, '>courses<');
    content = content.replace(/>Episodes</g, '>Lectures<');
    content = content.replace(/>Episode</g, '>Lecture<');
    content = content.replace(/>episode</g, '>lecture<');
    content = content.replace(/>episodes</g, '>lectures<');
    
    // Quotes (exact match for labels)
    content = content.replace(/['"]Drama['"]/g, '"Course"');
    content = content.replace(/['"]Dramas['"]/g, '"Courses"');
    content = content.replace(/['"]Episode['"]/g, '"Lecture"');
    content = content.replace(/['"]Episodes['"]/g, '"Lectures"');
    
    // Common multi-word labels
    content = content.replace(/Drama details/g, 'Course details');
    content = content.replace(/Edit Drama/g, 'Edit Course');
    content = content.replace(/Add New Drama/g, 'Add New Course');
    content = content.replace(/Create Drama/g, 'Create Course');
    content = content.replace(/Delete Drama/g, 'Delete Course');
    content = content.replace(/Delete drama/g, 'Delete course');
    content = content.replace(/No dramas found/g, 'No courses found');
    content = content.replace(/All Dramas/g, 'All Courses');
    content = content.replace(/Manage dramas/g, 'Manage courses');
    
    content = content.replace(/Add Episode/g, 'Add Lecture');
    content = content.replace(/Edit Episode/g, 'Edit Lecture');
    content = content.replace(/Delete Episode/g, 'Delete Lecture');
    content = content.replace(/Episode details/g, 'Lecture details');
    content = content.replace(/No episodes/g, 'No lectures');
    
    // Additional loose spaces (but only in user text, avoiding code)
    content = content.replace(/ episode /g, ' lecture ');
    content = content.replace(/ episodes /g, ' lectures ');
    content = content.replace(/ Episode /g, ' Lecture ');
    content = content.replace(/ Episodes /g, ' Lectures ');
    content = content.replace(/ drama /g, ' course ');
    content = content.replace(/ dramas /g, ' courses ');
    content = content.replace(/ Drama /g, ' Course ');
    content = content.replace(/ Dramas /g, ' Courses ');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
