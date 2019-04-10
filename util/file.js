const fs = require('fs');

exports.deleteFile = (filePath) => {
    // unlink : delete a file in the path
    fs.unlink(filePath, err => {
        // throw(err): it bubbles up to the default error handler in express 
        // It is used because the function does not have next(),
        //  and catch statement.
        if(err) throw(err);
    });
}