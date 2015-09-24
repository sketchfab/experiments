module.exports = function parseQueryString(queryString) {
    var result = {};
    queryString.split("&").forEach(function(part) {
        var item = part.split("=");
        result[item[0]] = decodeURIComponent(item[1]);
    });
    return result;
}
