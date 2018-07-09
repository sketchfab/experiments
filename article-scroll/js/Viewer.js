function Viewer(urlid, el, onReadyCallback) {
    this.urlid = urlid;
    this.el = el;
    this.api = null;
    this.onReadyCallback = onReadyCallback;
    this.initialize();
}

Viewer.prototype = {
    isReady: false,
    camera: null,
    initialize: function() {
        var client = new Sketchfab(this.el);

        var params = {
            ui_controls: 0,
            ui_infos: 0,
            ui_stop: 0,
            ui_watermark: 0,
            ui_inspector: 0,
            ui_color: 'ffffff',
            preload: 1,
            camera: 0,
            scrollwheel: 0,
            transparent: 1
        };

        client.init(
            this.urlid,
            Object.assign({}, params, {
                success: function onSuccess(api) {
                    this.api = api;
                    api.start();
                    api.addEventListener('viewerready', this.onViewerReady.bind(this));
                }.bind(this),
                error: function onError() {
                    console.error('Viewer error');
                }
            })
        );
    },

    onViewerReady: function() {
        this.isReady = true;
        this.api.getCameraLookAt(
            function(err, camera) {
                this.camera = camera;
                if (this.onReadyCallback) {
                    this.onReadyCallback();
                }
                console.info('Viewer ready');
            }.bind(this)
        );
    }
};
