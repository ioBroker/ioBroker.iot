const echarts = require("echarts");
const Canvas = require('canvas');
const {JSDOM} = require('jsdom');
const sharp = require('sharp');

const WIDTH = 512;
const HEIGHT = 340;

echarts.setCanvasCreator(() => Canvas.createCanvas(WIDTH, HEIGHT));

function generateSvg(options) {
    const {window} = new JSDOM();

    global.window = window;
    global.navigator = window.navigator;
    global.document = window.document;

    const root = document.createElement('div');
    root.style.cssText = `width: ${WIDTH}px; height: ${HEIGHT}px;`;

    const chart = echarts.init(root, null, {renderer: 'svg'});
    chart.setOption(options);

    const svg = root.querySelector('svg').outerHTML;
    chart.dispose();
    return svg;
}

function svg2image(svg, format) {
    if (format === 'svg') {
        Promise.resolve('data:image/svg+xml;base64,' + svg.toString('base64'));
    } else if (format === 'jpg') {
        return sharp(Buffer.from(svg))
            .jpeg()
            .toBuffer()
            .then(data => 'data:image/jpeg;base64,' + data.toString('base64'));
    } else {
        return sharp(Buffer.from(svg))
            .png()
            .toBuffer()
            .then(data => 'data:image/png;base64,' + data.toString('base64'));
    }
}

function getImage(timeSeries, min, max, format) {
    // convert data
    let svg;
    if (typeof timeSeries === 'object') {
        const data = timeSeries.filter(v => v && v.val !== null && v.val !== undefined).map(v =>({value: [v.ts, v.val]}));
        min = min || 80;
        max = max || 180;
        const options = {
            title: {
                text:  'Blutzucker in letzten 3 Stunden'
            },
            grid: {
                backgroundColor: 'white',
                show: true
            },
            xAxis: {
                type: 'time',
                splitLine: {
                    show: true
                },
                axisLabel: {
                    formatter: value => {
                        value = new Date(value);
                        return value.getHours() + ':' + value.getMinutes().toString().padStart(2, '0');
                    }
                }
            },
            yAxis: {
                type: 'value',
                splitLine: {
                    show: true
                },
                min: 40,
            },
            series: [{
                name: 'mg/dl',
                type: 'line',
                showSymbol: true,
                animation: false,
                hoverAnimation: false,
                data,
                smooth: true,
                markArea: {
                    itemStyle: {
                        normal: {
                            color: '#00800020'
                        },
                        emphasis: {
                            color: '#00800020'
                        }
                    },
                    data: [
                        [
                            {
                                yAxis: min,
                            },
                            {
                                yAxis: max,
                            }
                        ]
                    ],
                }
            }]
        };
        svg = generateSvg(options);
    } else {
        svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg"><g>
  <text font-size="36px" y="206.85" x="50" stroke-width="0" stroke="#000" fill="#000000">${timeSeries}</text>
</g></svg>`;
    }

    return svg2image(svg, format);
}

module.exports = getImage;
