var VideoEncoder = function(onload) {
    this.worker = new Worker('js/vendors/encodeworker.js');
    this.worker.onmessage = this.onmessage.bind(this);

    this.onload = onload.bind(this);
    this.isWorker = true;

    this.frames = [];
};

VideoEncoder.prototype.init = function(videoConfig, audioConfig, oninit, getFrame, app) {
    this.worker.postMessage({ action: 'init', data: { audioConfig, videoConfig } });
    this.oninit = oninit;
    this.getFrame = getFrame;
    this.closed = false;
    this.app = app;
};

VideoEncoder.prototype.sendFrame = function() {
    var frame = this.frames.pop();
    if (frame && !this.closed) {
        this.worker.postMessage({ action: frame.type });
        if (frame.type === 'audio') {
            this.worker.postMessage(frame.left, [frame.left.buffer]);
            this.worker.postMessage(frame.right, [frame.right.buffer]);
        } else {
            this.worker.postMessage(frame.pixels, [frame.pixels.buffer]);
        }
    }
};

VideoEncoder.prototype.queueFrame = function(frame) {
    this.frames.push(frame);
    this.sendFrame();
};

VideoEncoder.prototype.close = function(onsuccess) {
    this.closed = true;
    this.onsuccess = onsuccess;
    setTimeout(
        function(e) {
            this.worker.postMessage({ action: 'close' });
        }.bind(this),
        500
    );
};

VideoEncoder.prototype.onmessage = function(e) {
    var { data } = e;
    switch (data.action) {
        case 'loaded':
            this.onload();
            break;
        case 'initialized':
            if (this.oninit) this.oninit();
            this.getFrame();
            break;
        case 'ready':
            if (!this.closed) {
                this.getFrame();
            }
            break;
        case 'return':
            this.onsuccess(data.data);
            break;
        case 'error':
            break;
        default:
    }
};
