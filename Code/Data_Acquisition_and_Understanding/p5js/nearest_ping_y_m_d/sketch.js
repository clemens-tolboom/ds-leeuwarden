var gps;
var table;

/*
 * preload seems buggy
 * we do busy waiting in the draw loop
 */
// function preload() {
//     console.log('preload.enter');
//     loadData();
//     console.log('preload.exit');
// }

function setup() {
    console.log('setup.enter');

    pDatum = createP("date");
    createCanvas(1200, 1200);
    //createCanvas(windowWidth, windowHeight);

    gps = getGPSData();
    loadData();

    background(128);
    colorMode(HSB, 100);

    frameRate(7);

    console.log('setup.exit');
}

/**
 * f(x,y) => {x,y}
 *
 * scale seems to have a bug so we do the scale/translate ourselves.
 *
 * @param {float} x 
 * @param {float} y 
 */
function toCoord(x, y) {
    var cx = gps.rect.cx;
    var cy = gps.rect.cy;
    var dx = 1.1 * gps.rect.dx;
    var dy = 1.1 * gps.rect.dy;

    return {
        x: (0.5 + ((x - cx) / dx)) * width,
        y: (0.5 - ((y - cy) / dy)) * height
    }
}

function drawSensor(s) {
    var c = toCoord(s.latitude, s.longitude);
    noStroke();
    strokeWeight(1);
    fill(0, 0, 255);
    ellipse(c.x, c.y, 10, 10);
}

function drawSensors() {
    gps.rows.forEach(function (v, i, a) {
        drawSensor(v);
    });
}

function drawArea() {
    var r1 = toCoord(gps.rect.x1, gps.rect.y1);
    rect(r1.x, r1.y, width * 0.9, -height * 0.9);
}


function drawLine(p) {
    var from = gps.rows.filter(function (v, i, a) {
        return v.sensor == parseInt(p.from);
    });
    var to = gps.rows.filter(function (v, i, a) {
        // TODO: weird caching problem: aantal is swapped with to
        //return v.sensor == parseInt(p.aantal);
        return v.sensor == parseInt(p.to);
    });

    //console.log(from, to);
    if (from.length == 1) {
        from = from.shift();
    }
    else {
        //       console.log('from not found for', p);
        return;
    }

    if (to.length == 1) {
        to = to.shift();
    }
    else {
        //        console.log('to not found for', p);
        return;
    }

    var p1 = toCoord(from.latitude, from.longitude);
    var p2 = toCoord(to.latitude, to.longitude);

    stroke(map(p.day, 0, 31, 0, 100), 100, 100);

    var w = map(p.aantal, 0, 2000, 10, 50);
    strokeWeight(w);

    //console.log(p1);
    line(p1.x, p1.y, p2.x, p2.y);
}

var rowIndex = 0;
var datum = '';

function draw() {
    drawSensors();

    // stroke(0, 0, 255);
    // fill(0, 255, 0)
    // var e1 = toCoord(gps.rect.cx, gps.rect.cy);
    // ellipse(e1.x, e1.y, 10, 10);

    // Busy waiting for devices unfortunately
    if (!table.columns || table.columns.length == 0) {
        console.log('Loading...');
    }
    else {
        //console.log(table.rows.length);
        //console.log(table.rows[0]);
        //noLoop();
        // return;

        var row = table.rows[rowIndex].obj;
        var d = '' + row.year + '-' + row.month + '-' + row.day;
        pDatum.html(d);
        if (d === datum) {
            while (d === datum) {
                drawLine(row);
                rowIndex++;
                if (rowIndex == table.rows.length) {
                    rowIndex = 0;
                }
                var row = table.rows[rowIndex].obj;
                var d = '' + row.year + '-' + row.month + '-' + row.day;
            }
        }
        datum = d;
        //noLoop();
    }
}

function loopData() {
    var rolodex = {
        year: -1,
        month: -1,
        day: -1
    }
    console.log(table.rows[0].obj);
    table.rows.forEach(element => {
        var o = element.obj;
        if (o.year != rolodex.year) {
            console.log(rolodex.year)
            rolodex.year = o.year;
            rolodex.month = o.month;
            rolodex.day = o.day;
        }
    });

}

function getGPSData() {
    // Don't forget to add \
    var tableInput = '\t\
"sensor_id";"latitude";"longitude"\t\
1074;"5,794506";"53,200509"\t\
1078;"5,793081";"53,200826"\t\
1079;"5,797128";"53,200347"\t\
1625;"5,792219";"53,199183"\t\
1627;"5,793139";"53,200104"\t\
1631;"5,791639";"53,202216"\t\
1636;"5,796556";"53,201777"\t\
2054;"5,795879";"53,199645"\t\
2779;"5,799048";"53,202032"\t\
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
        var latitude = v[1].replace(',', '.').replace(/"/g, '');
        var longitude = v[2].replace(',', '.').replace(/"/g, '');
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
        x1: Math.min(...lats),
        x2: Math.max(...lats),
        y1: Math.min(...lons),
        y2: Math.max(...lons)
    }

    table.rect.dx = table.rect.x2 - table.rect.x1;
    table.rect.dy = table.rect.y2 - table.rect.y1;

    table.rect.cx = (table.rect.x1 + table.rect.x2) / 2;
    table.rect.cy = (table.rect.y1 + table.rect.y2) / 2;

    return table;

}

/*
 * TODO: loading the sensor table does not work
 * - it is a ; separated file which cannot be loaded
 * - using the file opject fails miserably on Chrome and Firefox
 *
    var file = 'sensor_gps_view.csv';
    var f = new p5.File(file);
 */
// function _loadSensors() {

//     console.log('loadSensors.enter');
//     table = loadTable('sensor_gps_view.csv', 'header', function () {
//         console.log('loadSensors.success');
//         console.log(table.columns);
//     }, function () {
//         console.log('loadSensors.error');
//     });

// }

function loadData() {
    console.log('loadData.enter');
    table = loadTable('nearest_ping_y_m_d.csv', 'tsv', 'header', function () {
        console.log('loadData.success');
        console.log(table.columns);
        console.log(table.rows);
    }, function () {
        console.log('loadData.error');
    });
}
