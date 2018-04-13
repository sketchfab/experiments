(function() {
    'use strict';

    var Reader = zip.Reader;

    function isHttpFamily(url) {
        var a = document.createElement('a');
        a.href = url;
        return a.protocol === 'http:' || a.protocol === 'https:';
    }

    function HttpProgressReader(url, options) {
        var that = this;

        function getData(callback, onerror) {
            var request;
            if (!that.data) {
                request = new XMLHttpRequest();
                request.addEventListener(
                    'load',
                    function() {
                        if (!that.size)
                            that.size =
                                Number(request.getResponseHeader('Content-Length')) ||
                                Number(request.response.byteLength);
                        that.data = new Uint8Array(request.response);
                        callback();
                    },
                    false
                );
                request.addEventListener('error', onerror, false);
                request.open('GET', url);
                request.responseType = 'arraybuffer';
                request.send();
                request.onprogress = function(e) {
                    if (e.lengthComputable) {
                        if (options.onProgress && typeof options.onProgress === 'function') {
                            options.onProgress({
                                url: url,
                                loaded: e.loaded,
                                total: e.total
                            })
                        }
                    }
                };
            } else callback();
        }

        function init(callback, onerror) {
            if (!isHttpFamily(url)) {
                // For schemas other than http(s), HTTP HEAD may be unavailable,
                // so use HTTP GET instead.
                getData(callback, onerror);
                return;
            }
            var request = new XMLHttpRequest();
            request.addEventListener(
                'load',
                function() {
                    that.size = Number(request.getResponseHeader('Content-Length'));
                    // If response header doesn't return size then prefetch the content.
                    if (!that.size) {
                        getData(callback, onerror);
                    } else {
                        callback();
                    }
                },
                false
            );
            request.addEventListener('error', onerror, false);
            request.open('HEAD', url);
            request.send();
        }

        function readUint8Array(index, length, callback, onerror) {
            getData(function() {
                callback(new Uint8Array(that.data.subarray(index, index + length)));
            }, onerror);
        }

        that.size = 0;
        that.init = init;
        that.readUint8Array = readUint8Array;
    }
    HttpProgressReader.prototype = new Reader();
    HttpProgressReader.prototype.constructor = HttpProgressReader;
    zip.HttpProgressReader = HttpProgressReader;
})();
