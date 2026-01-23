module.exports = {
    entry: './Packet.js',
    output: {
        path: __dirname,
        filename: 'Packet.min.js',
        library: {
            type: 'module'
        }
    },
    experiments: {
        outputModule: true
    },
    mode: "production",
};