/**
 * @param {string} url
 * @param {Object} options
 * @param {boolean} options.rewriteAssetURLs False by default. Set to true to replace URLs in the GLTF file with local blob URLs.
 * @param {function} options.onProgress Function called with percentage everytime progress increases.
 */
function Downloader(url, options) {
  this.url = url;
  this.options = options;
  this.progress = 0;
}

Downloader.prototype = {
  /**
   * @return {Promise} Promise that resolves with an assetmap with all assets and url of the root gltf file
   */
  download: function() {
    this.progress = 0;

    this._onProgress({
      type: "download",
      progress: 0.0
    });

    var url = this.url;
    return new Promise(
      function(resolve, reject) {
        var assetMap = {};
        var gltfUrl = "scene.gltf";
        this._readZip(
          url,
          function(e) {
            this._onProgress({
              type: "download",
              progress: e.loaded / e.total
            });
          }.bind(this)
        )
          .then(
            function(entries) {
              return this._parseZip(entries);
            }.bind(this)
          )
          .then(function(assetMap) {
            resolve(assetMap);
          })
          .catch(reject);
      }.bind(this)
    );
  },

  _onProgress: function(message) {
    var ZIP_PROGRESS_FACTOR = 0.5;
    var value;

    if (message.type === "download") {
      value = message.progress * (1 - ZIP_PROGRESS_FACTOR);
    }

    if (message.type === "zip") {
      if (message.progress < ZIP_PROGRESS_FACTOR) {
        value = ZIP_PROGRESS_FACTOR;
      }
      value = 1 * ZIP_PROGRESS_FACTOR + message.progress * ZIP_PROGRESS_FACTOR;
    }

    if (message.type === "final") {
      value = message.progress;
    }

    value = Math.floor(100 * value);

    if (value >= this.progress) {
      this.progress = value;
      if (this.options.onProgress) {
        this.options.onProgress(this.progress);
      }
    }
  },

  _readZip: function(url, onProgress) {
    return new Promise(function(resolve, reject) {
      var reader = new zip.HttpProgressReader(url, { onProgress: onProgress });
      zip.createReader(
        reader,
        function(zipReader) {
          zipReader.getEntries(resolve);
        },
        reject
      );
    });
  },

  _parseZip: function(entries) {
    function _parseZip(resolve, reject) {
      var url;
      var entry;
      var promises = [];
      var completedPromises = 0;
      var promise;

      for (var i = 0, l = entries.length; i < l; i++) {
        entry = entries[i];

        if (entry.directory === true) {
          continue;
        }

        if (entry.filename.match(/\.gltf$/)) {
          url = entry.filename;
        }

        promise = this._saveEntryToBlob(
          entry,
          function onProgress(currentIndex, totalIndex) {
            this._onProgress({
              type: "zip",
              progress:
                currentIndex / totalIndex / entries.length +
                completedPromises / entries.length
            });
          }.bind(this)
        );

        promise.then(function(result) {
          completedPromises++;
          return result;
        });

        promises.push(promise);
      }

      if (!url) {
        return reject("Can not find a .gltf file");
      }

      var blobsReady = Promise.all(promises);
      blobsReady.then(
        function(blobs) {
          this._onProgress({
            type: "final",
            progress: 1.0
          });

          var assets = blobs.reduce(function(acc, cur) {
            acc[cur.name] = cur.url;
            return acc;
          }, {});

          var shouldRewriteAssetsURLs =
            this.options &&
            this.options.hasOwnProperty("rewriteAssetURLs") &&
            this.options.rewriteAssetURLs === true;

          if (shouldRewriteAssetsURLs) {
            var assetsPromise = this._rewriteAssetURLs(assets, url, blobs);
            assetsPromise.then(function(modifiedAssets) {
              resolve({
                assets: assets,
                originalAssets: Object.assign({}, assets),
                modifiedAssets: modifiedAssets,
                url: url
              });
            });
          } else {
            resolve({
              assets: assets,
              originalAssets: Object.assign({}, assets),
              modifiedAssets: null,
              url: url
            });
          }
        }.bind(this)
      );
    }

    return new Promise(_parseZip.bind(this));
  },

  _rewriteAssetURLs: function(assets, gltfPath, blobs) {
    return new Promise(function(resolve, reject) {
      var newAssets = Object.assign({}, assets);
      var reader = new FileReader();

      var gltfBlob = blobs.reduce(function(acc, cur) {
        if (cur.name === gltfPath) {
          return cur;
        }
        return acc;
      }, null);

      if (!gltfBlob) {
        return reject("Cannot rewrite glTF (glTF not found)");
      }

      reader.onload = function() {
        try {
          var json = JSON.parse(reader.result);

          // Replace original buffers and images by blob URLs
          if (json.hasOwnProperty("buffers")) {
            for (var i = 0; i < json.buffers.length; i++) {
              json.buffers[i].uri = newAssets[json.buffers[i].uri];
            }
          }

          if (json.hasOwnProperty("images")) {
            for (var i = 0; i < json.images.length; i++) {
              json.images[i].uri = newAssets[json.images[i].uri];
            }
          }

          var fileContent = JSON.stringify(json, null, 2);
          var updatedBlob = new Blob([fileContent], { type: "text/plain" });
          var gltfBlobUrl = window.URL.createObjectURL(updatedBlob);
          newAssets[gltfPath] = gltfBlobUrl;
          resolve(newAssets);
        } catch (e) {
          reject("Cannot parse glTF file", e);
        }
      };
      reader.readAsText(gltfBlob.blob);
    });
  },

  _saveEntryToBlob: function(entry, onProgress) {
    return new Promise(function(resolve, reject) {
      entry.getData(
        new zip.BlobWriter("text/plain"),
        function onEnd(data) {
          var url = window.URL.createObjectURL(data);
          resolve({
            name: entry.filename,
            url: url,
            blob: data
          });
        },
        onProgress
      );
    });
  }
};
