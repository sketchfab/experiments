var imgurUpload = function(blob, model, callback) {

    var fd = new FormData();

    fd.append('image', blob, '3d-sketchfab-model.gif');

    fd.append('title', model.name);
    fd.append('description', model.viewerUrl);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.imgur.com/3/image');
    xhr.setRequestHeader('Authorization', 'Client-ID 0c3e658c3d61441');
    xhr.onload = function() {
        var response = JSON.parse(xhr.responseText);
        console.log(response);
        if (response.status === 200) {
            callback(null, response.data);
        }
    };
    xhr.send(fd);

};

module.exports = imgurUpload;
