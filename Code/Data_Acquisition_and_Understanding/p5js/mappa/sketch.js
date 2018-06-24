let myMap;
let canvas;
const mappa = new Mappa('Leaflet');

let gps = getGPSData();

const center = {
  lat: gps.rect.cy,
  lng: gps.rect.cx,
};

const options = {
  lat: center.lat,
  lng: center.lng,
  zoom: 17,
  style: "http://{s}.tile.osm.org/{z}/{x}/{y}.png"
}

let waitingRooms = generateWaitingRooms();

let datum = testDate('01', '00:00');
let currentDate = new Date();

let timestamp = currentDate.getTime()
let startTime = false;

// In ms
let timeStep = 60 * 1000;
// How fast to move to first sensor
let waitTime = 60 * 60 * 1000;
// How fast to move away from last sensor
let exitTime = 60 * 60 * 1000;

currentDate.setTime(Date.parse(datum) - waitTime);


let status;

let devices = [];

function setup() {
  container = createDiv('');
  
  status = createDiv('This is an HTML string!', container);
  pause = createButton('Pause', container);
  pause.mousePressed(function () {
    noLoop();
  });
  fps = createDiv('&nbsp;', container);

  createDiv('&nbsp;', container);

  canvas = createCanvas(1920, 1200);
  myMap = mappa.tileMap(options);
  myMap.overlay(canvas)

  // Only redraw the point when the map changes and not every frame.
  myMap.onChange(drawPoints);


  // let data = testData();
  // loadPaths(data);
  // startTime = true;

  let data = loadData();

  //frameRate(5);
}

function loadPaths(data) {
  let num_path = 0;
  let paths = {};
  data.forEach(function (v, i, a) {

    // if (num_path > 400) {
    //   return;
    // }

    if (v.obj) {
      v = v.obj;
      v.time = v.timestamp;
      let dat = new Date();
      dat.setTime(Date.parse(v.timestamp));
      v.timestamp = dat;
    }
    if (!paths[v.device]) {
      paths[v.device] = [];
      num_path++;
    }
    if (!v.sensor_id) {
      v.sensor_id = v.sensor;
    }

    v.sensor = getSensor(v.sensor_id);
    paths[v.device].push({
      sensor: v.sensor,
      sensor_id: v.sensor_id,
      device: v.device,
      timestamp: v.timestamp,
      time: v.time,
    });
  });

  try {
    for (key in paths) {
      var p = paths[key];
      // if (p.length > 1) {
        devices.push(new Device(paths[key]));
      // }
    }
  } catch (error) {
    console.log(error);
  }

  console.log('Devices', devices.length);
  startTime = true;
};

function draw() {
  updateDatum();
  background(255, 255, 255, 0);

  fps.html(Math.floor(frameRate()));

  //console.log(currentDate.getTime());
  timestamp = currentDate.getTime();

  let activeDevices = false;
  devices.forEach(function (v, i, a) {
    if (!v.isFinished()) {
      activeDevices = true;
    }
    v.update();
    v.draw();
  });

  if (!activeDevices) {
    //noLoop();
  }
}

// ========== CLASSES ==========

/**
 * Paths is a set of uncorrelated Path.
 *
 * Each path has the same device.
 */
class Paths {

  /**
   * The chain is broken into separate path based on split interval.
   *
   * @param {Array} chain list of events
   */
  constructor(chain) {

  }
}

/**
 * Path is a serie of correlated events.
 */
class Path {
  constructor(paths) {
    this.paths = paths;
    this.index = 0;

    this.current = {};
    this.previous = {};
    this.lng = center.lng;
    this.lat = center.lat;

    this.active = true;
    this.finished = false;

    this.inCity = false;

    this.setNext();
  }

  tick() {
    this.index++;
    this.setNext();
  }


  setNext() {
    if (this.index < this.paths.length) {
      //console.log(this.paths[this.index].time.getTime());
    }

    if (this.index === 0) {
      this.inCity = false;

      // Create virtual position
      let prev = this.previous;
      let w = this.paths[0].sensor.waitingRoom;
      prev.lng = w.longitude;
      prev.lat = w.latitude;

      let curr = this.current;
      let s = this.paths[0].sensor;
      curr.lng = s.longitude;
      curr.lat = s.latitude;

      this.current.timestamp = this.paths[0].timestamp.getTime();
      this.previous.timestamp = this.current.timestamp - waitTime;

    } else if (this.index < this.paths.length) {
      this.inCity = true;

      let t = this.previous;
      this.previous = this.current;
      this.current = t;

      let s = this.paths[this.index].sensor;
      t.lng = s.longitude;
      t.lat = s.latitude;

      this.current.timestamp = this.paths[this.index].timestamp.getTime();

    } else if (this.index === this.paths.length) {
      this.inCity = false;

      let t = this.previous;
      this.previous = this.current;
      this.current = t;

      let w = this.paths[this.index - 1].sensor.waitingRoom;
      t.lng = w.longitude;
      t.lat = w.latitude;

      t.timestamp = this.previous.timestamp + exitTime;
    }
    else {
      this.active = false;
    }
  }

  checkTime() {
    if (!this.finished) {

      while (this.index < this.paths.length && this.current.timestamp < timestamp) {
        this.tick();
      }

      let dt = this.current.timestamp - this.previous.timestamp;
      let pt = timestamp - this.previous.timestamp;
      //console.log(this.paths[0].device, this.index, dt, pt, timestamp < this.previous.timestamp, timestamp < this.current.timestamp)
      if (dt <= 0.0) {
        pt = 0.0;
        dt = 1.0
      } else if (pt < 0) {
        pt = 0.0;
      } else if (pt > dt) {
        pt = dt;
      }
      this.setLonLat(pt / dt);
    }
  }

  setLonLat(percentage) {
    let lngPrev = this.previous.lng;
    let latPrev = this.previous.lat;

    let latCurrent = this.current.lat;
    let lngCurrent = this.current.lng;

    this.lng = lerp(lngPrev, lngCurrent, percentage);
    this.lat = lerp(latPrev, latCurrent, percentage);
  }
}

class Device {
  constructor(paths) {
    // Path is sorted by time
    this.paths = new Path(paths);
    this.ticks = -20;
    this.color = color(random(0, 256), random(0, 256), random(0, 256), 100);
  }

  isFinished() {
    return this.paths.finished;
  }

  update() {
    if (!this.isFinished()) {
      this.paths.checkTime();

      // this.ticks++;
      // if (this.ticks > 100) {
      //   this.paths.tick();
      //   this.ticks = 0;
      //   if (!this.paths.active) {
      //     this.paths.finished = true;
      //   }
      // }
      // this.paths.setLonLat(Math.max(0, this.ticks) / 100);
    }
  }

  draw() {
    if (!this.isFinished()) {
      const coor = myMap.latLngToPixel(this.paths.lat, this.paths.lng);
      noStroke();
      fill(this.color);
      let r = 5;
      if (this.paths.inCity) {
        r = 10;
      }
      ellipse(coor.x, coor.y, r, r);
    }
  }
}

function drawPoints() {
  clear();

  gps.rows.forEach(function (v, i, a) {
    let r = 30;

    let lat = v.latitude;
    let lng = v.longitude;
    let coords = myMap.latLngToPixel(lat, lng);
    fill(230, 100, 100, 100);
    ellipse(coords.x, coords.y, 2*r, 2*r);

    lat = v.waitingRoom.latitude;
    lng = v.waitingRoom.longitude;
    coords = myMap.latLngToPixel(lat, lng);
    fill(100, 100, 230, 100);
    ellipse(coords.x, coords.y, r, r);
  });
}

function updateDatum() {
  if (startTime) {
  var c = currentDate.getTime();
  // Add 60 secconds
  c += (timeStep);
  currentDate.setTime(c);
  datum = currentDate.toISOString();

  status.html(datum);
  }
  else {
    status.html('Wating for data to load ...');
  }
}


function getSensor(sensor_id) {
  let sensors = gps.rows.filter(function (v, i, a) {
    return v.sensor == sensor_id;
  });

  if (sensors.length === 1) {
    return sensors[0];
  }
  console.error('Unknown sensor', sensor_id);
}

/**
 * Waiting rooms are lined up from center point.
 */
function generateWaitingRooms() {
  let sx = gps.rect.dx;
  let sy = gps.rect.dy;
  gps.rows.forEach(function (v, i, a) {
    let dx = v.longitude - gps.rect.cx;
    let dy = v.latitude - gps.rect.cy;

    let s = Math.max(Math.abs(dx / sx), Math.abs(dy / sy));
    a[i].waitingRoom = {
      sensor: v.sensor,
      latitude: gps.rect.cy + dy * 1.5 / s,
      longitude: gps.rect.cx + dx * 1.5 / s,
    };
  });
}

// ====== Code copied ======

function getGPSData() {
  // Don't forget to add \
  var tableInput = '\t\
"sensor_id";"latitude";"longitude";"description"\t\
1074;"5,794506";"53,200509";"Coolcat / Nieuwestad"\t\
1078;"5,793081";"53,200826";"We / Nieuwestad"\t\
1079;"5,797128";"53,200347";"We / Wirdumerdijk"\t\
1625;"5,792219";"53,199183";"Albert Heijn/ Prins Hendrikstraat"\t\
1627;"5,793139";"53,200104";"No Nonsens/Ruiterskwartier"\t\
1631;"5,791639";"53,202216";"Eric Steenbergen Designwinkel / Kleine Kerkstraat"\t\
1636;"5,796556";"53,201777";"Zenzi / Sint Jacobsstraat"\t\
2054;"5,795879";"53,199645";"Winkelcentrum Zaailand / Ruiterskwartier"\t\
2779;"5,799048";"53,202032";"Cafe Blikspuit / Over de Kelders"\t\
1622;"5,796900";"53,198300";"Wirdumerpoortsbrug brugwachtershuisje"\t\
';

  var table = tableInput.split('\t');
  table = table.filter(function (v, i, a) { return v != '' });
  table = table.map(function (v, i, a) { return v.split(';') });

  var cols = table.shift();
  var rows = table;
  table = {
    columns: table[0],
    rows: table
  }

  table.rows = table.rows.map(function (v, i, a) {
    var latitude = v[2].replace(',', '.').replace(/"/g, '');
    var longitude = v[1].replace(',', '.').replace(/"/g, '');
    return {
      sensor: parseInt(v[0]),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    }
  });
  console.log(table);

  var lats = table.rows.map(function (v, i, a) { return v.latitude });
  var lons = table.rows.map(function (v, i, a) { return v.longitude });

  table.rect = {
    x1: Math.min(...lons),
    x2: Math.max(...lons),
    y1: Math.min(...lats),
    y2: Math.max(...lats),
  }

  table.rect.cx = (table.rect.x1 + table.rect.x2) / 2;
  table.rect.cy = (table.rect.y1 + table.rect.y2) / 2;

  table.rect.dx = (table.rect.x2 - table.rect.x1) /2;
  table.rect.dy = (table.rect.y2 - table.rect.y1) / 2;

  return table;
}

function loadData() {
  console.log('loadData.enter');
  table = loadTable('2018-04-01-device-24-06-2018.csv', 'header', function () {
    console.log('loadData.success');
    console.log('Cols', table.columns);
    console.log('Rows', table.rows.length);

    loadPaths(table.rows);
  }, function () {
    console.log('loadData.error');
  });
}

// ====== Test data ========

function testDate(day, time) {
  let d = "2018-04-" + day + ' ' + time;
  let dat = new Date();
  dat.setTime(Date.parse(d));
  return dat;
}

function testPoint(sensor_id, device, time) {
  return {
    sensor_id: sensor_id,
    device: device,
    timestamp: time,
  }
}

function testData() {
  return [
    testPoint(1074, 1, testDate('01', '12:00')),
    testPoint(1078, 1, testDate('01', '13:00')),
    testPoint(1079, 1, testDate('01', '14:00')),
    testPoint(1625, 1, testDate('01', '15:00')),
    testPoint(1627, 1, testDate('01', '16:00')),
    testPoint(1631, 1, testDate('01', '17:00')),
    testPoint(1636, 1, testDate('02', '12:00')),
    testPoint(2054, 1, testDate('02', '14:00')),
    testPoint(2779, 1, testDate('02', '16:00')),

    testPoint(1078, 2, testDate('01', '08:00')),
    testPoint(1074, 2, testDate('01', '09:00')),
    testPoint(1079, 2, testDate('01', '11:00')),
    testPoint(2779, 2, testDate('02', '13:00')),
    testPoint(1631, 2, testDate('01', '18:00')),
    testPoint(2054, 2, testDate('02', '09:00')),
    testPoint(1636, 2, testDate('02', '10:00')),

    testPoint(1078, 123, testDate('01', '08:00')),
    testPoint(1074, 124, testDate('01', '09:00')),
    testPoint(1079, 125, testDate('01', '11:00')),
    testPoint(2779, 125, testDate('02', '13:00')),
    testPoint(1631, 126, testDate('01', '18:00')),
    testPoint(2054, 127, testDate('02', '09:00')),
    testPoint(1636, 128, testDate('02', '10:00')),

  ];
}
