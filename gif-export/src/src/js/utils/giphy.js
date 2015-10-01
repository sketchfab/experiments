var giphyUpload = function(blob, model, api_key, callback) {

    var tags = model.tags;
    tags.push('sketchfab');
    tags.push('3D');

    var fd = new FormData();

    fd.append('file', blob, '3d-sketchfab-model.gif');
    fd.append('username', 'sketchfab');
    fd.append('api_key', api_key);
    fd.append('tags', tags.join(','));
    fd.append('source_post_url', model.viewerUrl);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://upload.giphy.com/v1/gifs");
    xhr.onload = function() {
        var response = JSON.parse(xhr.responseText);
        console.log(response);
        if (response.meta.status === 200) {
            callback(null, response.data);
        }
    };
    xhr.send(fd);

};

module.exports = giphyUpload;
