export const AXIS_UNITS = {
  x: {
    rectStart: 'x1',
    rectEnd: 'x2',
    rectOffsetCounter: position => (position === 'top' ? 'y2' : 'y1'),
    rectOffset: position => (position === 'top' ? 'y1' : 'y2'),
  },
  y: {
    rectStart: 'y2',
    rectEnd: 'y1',
    rectOffsetCounter: position => (position === 'left' ? 'x2' : 'x1'),
    rectOffset: position => (position === 'left' ? 'x1' : 'x2'),
  },
};

export const COLOR = [
  '#2b99f0', '#8ac449', '#00C4C5', '#ffde00', '#ff7781', '#8470ff', '#75cd8e',
  '#48d1cc', '#fec64f', '#fe984f', '#0052ff', '#00a48c', '#83cfde', '#dfe32d',
  '#ff7d40', '#99c7ff', '#a5fee3', '#0379c9', '#eef093', '#ffa891', '#00c5cd',
  '#009bc7', '#cacaff', '#ffc125', '#df6264',
];

// export const COLOR = [
//   '#00C8FC', '#00F1CD', '#C19F87', '#008FD2', '#93F7FE', '#00FC78', '#0058DE',
//   '#3BDEFF', '#254763', '#BAEDF9', '#A24E3D', '#1FD017', '#F1D3B6', '#AFC9C9',
//   '#498700', '#3650FE', '#8786EF', '#68FBFB', '#BCF061', '#CBD3EA',
// ];

export const LINE_OPTION = {
  show: true,
  highlight: {
    pointSize: 5,
  },
  xAxisIndex: 0,
  yAxisIndex: 0,
  point: true,
  pointSize: 4,
  pointStyle: '',
  lineWidth: 2,
  fill: false,
  fillOpacity: 0.4,
};

export const BAR_OPTION = {
  show: true,
  highlight: {
    pointSize: 5,
  },
  xAxisIndex: 0,
  yAxisIndex: 0,
  category: true,
};


export const AXIS_OPTION = {
  min: null,
  max: null,
  autoScaleRatio: null,
  startToZero: false,
  showGrid: true,
  axisLineColor: '#b4b6ba',
  gridLineColor: '#e7e9ed',
  timeFormat: 'mm:ss',
  range: null,
  interval: null,
  decimalPoint: null,
  labelStyle: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'Droid Sans',
  },
};

export const TIME_INTERVALS = {
  millisecond: {
    common: true,
    size: 1,
    steps: [1, 2, 5, 10, 20, 50, 100, 250, 500],
  },
  second: {
    common: true,
    size: 1000,
    steps: [1, 2, 5, 10, 30],
  },
  minute: {
    common: true,
    size: 60000,
    steps: [1, 2, 5, 10, 30],
  },
  hour: {
    common: true,
    size: 3600000,
    steps: [1, 2, 3, 6, 12],
  },
  day: {
    common: true,
    size: 86400000,
    steps: [1, 2, 5],
  },
  week: {
    common: false,
    size: 604800000,
    steps: [1, 2, 3, 4],
  },
  month: {
    common: true,
    size: 2.628e9,
    steps: [1, 2, 3],
  },
  quarter: {
    common: false,
    size: 7.884e9,
    steps: [1, 2, 3, 4],
  },
  year: {
    common: true,
    size: 3.154e10,
  },
};