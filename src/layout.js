var split_layout = Split(["#visualizerArea", "#codeArea"], {
    elementStyle: function (dimension, size, gutterSize) {
        return { 'flex-basis': 'calc(' + size + '% - ' + gutterSize + 'px)' }
    },
    gutterStyle: function (dimension, gutterSize) { return { 'flex-basis': gutterSize + 'px' } },
    sizes: [50, 50],
    minSize: 300,
    gutterSize: 6,
    cursor: 'col-resize'
});