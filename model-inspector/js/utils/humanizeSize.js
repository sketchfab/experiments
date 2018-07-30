function humanSize(size) {
    var suffixes = ['b', 'KiB', 'MiB', 'GiB'];

    for (var i = 0; i < suffixes.length; i++, size /= 1024) {
        if (size < 1024) {
            return Math.floor(size) + ' ' + suffixes[i];
        }
    }
    return Math.floor(size) + ' ' + suffixes[suffixes.length - 1];
}
