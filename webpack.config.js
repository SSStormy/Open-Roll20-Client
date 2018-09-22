module.exports = {
    entry: {
        "index": "./src/index.ts"
    },
    mode: "development",
    target: "node",

    devtool: "source-map",

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
            },
            {
                test: /\.js$/,
                use: ["source-map-loader"],
                enforce: "pre"
            },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    }
};