var App = {
  state: {
    isLoading: false,
    viewer: "three"
  },

  assets: null,

  init: function() {
    Search.init();
    App.render(App.state, {});
  },

  initViewer: function(name) {
    var viewers = {
      three: ThreeViewer
    };

    if (window.Viewer) {
      window.Viewer.dispose();
    }

    if (viewers.hasOwnProperty(name)) {
      window.Viewer = viewers[name];
      window.Viewer.init();

      if (App.assets) {
        window.Viewer.loadGltf(App.assets.modifiedAssets, App.assets.url);
      }
    }
  },

  setState: function(newState) {
    var previousState = Object.assign({}, App.state);
    App.state = Object.assign(App.state, newState);
    App.render(App.state, previousState);
  },

  render: function(state, previousState) {
    Search.render();

    var loadingEl = document.querySelector(".loading");
    loadingEl.style.display = state.isLoading ? "block" : "none";

    if (state.viewer !== previousState.viewer) {
      this.initViewer(state.viewer);
    }
  },

  onViewerChange: function(e) {
    var target = e.target;
    var value = target.value;
    App.setState({
      viewer: value
    });
  },

  /**
   * Requests a model download
   * @param {Object} download Download response
   */
  download: function(download) {
    var loadingProgressEl = document.querySelector(".loading__progress");

    App.setState({
      isLoading: true
    });

    var url = download.gltf.url;
    var downloader = new Downloader(url, {
      rewriteAssetURLs: true,
      onProgress: function(progress) {
        loadingProgressEl.innerText = progress + "%";
      }
    });

    if (App.assets !== null) {
      App.freeAssets();
    }

    var downloadPromise = downloader.download();

    downloadPromise
      .then(function(assetMap) {
        App.assets = assetMap;

        if (typeof Viewer !== "undefined") {
          Viewer.loadGltf(App.assets.modifiedAssets, assetMap.url);
        } else {
          console.log("Archive loaded", assetMap);
        }

        App.setState({
          isLoading: false
        });
      })
      .catch(function(error) {
        console.error("Can not load gltf", error);
        App.setState({
          isLoading: false
        });
      });
  },

  /**
   * Free previously downloaded assets for garbage collection
   */
  freeAssets: function() {
    if (App.assets !== null) {
      var keys = Object.keys(App.assets);
      keys.forEach(function(key) {
        window.URL.revokeObjectURL(App.assets[key]);
      });
    }
  }
};

App.init();
