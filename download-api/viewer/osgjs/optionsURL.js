var optionsURL = {};
(function(options) {
    var vars = [],
        hash;
    var indexOptions = window.location.href.indexOf('?');
    if (indexOptions < 0) return;

    var hashes = window.location.href.slice(indexOptions + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        var element = hash[0];
        vars.push(element);
        var result = hash[1];
        if (result === undefined) {
            result = '1';
        }
        options[element] = result;
    }
})(optionsURL);
