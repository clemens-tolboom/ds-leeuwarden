/*

ds-leeuwarden/Code/Data_Acquisition_and_Understanding/node % node index.js
Processing ../../../../leeuwarden_data/locatus/locatusdata_bewerkt.csv


| Bytes | Duration | Devices | Avg seen | Min seen | Max seen |
| 10M | 1s | 110449 1.8255122273628552 1 1031 |
| 100M | 10 s | 513481 | 3.849848387768973 | 1 | 1732 |
| 1G | 102 s | 1445776 | 13.433684056174677 | 1 | 18025 |
| 10G | 179 s | 1733810 | 18.684389869708905 | 1 | 32432 |

*/

const fs = require('fs');
var parse = require('csv-parse');
var async = require('async');
var fastcsv = require('fast-csv');

const project_files = '../../../../leeuwarden_data/';
const locatus = 'locatus/locatusdata_bewerkt.csv';

var inputFile = project_files + locatus;
//readFile(file);

// function readFile(file) {
//   fs.readFile(file, function(err, data){console.log(data);});
// }


var column = ["id", "VirtualSensorCode", "DateTimeLocal", "Duration", "code_address"];
var sep = ';';

// https://www.npmjs.com/package/line-by-line

var LineByLineReader = require('line-by-line')

var options = {
    //encoding: 'utf8',
    //skipEmptyLines: false,
    // In bytes
    end: 10 ** 11,
};

console.log("Processing " + inputFile + ' reading ' + options.end + ' bytes');
console.time('reading file');
var lr = new LineByLineReader(inputFile, options);

var firstLine = true;
var replace = /\"/g;

var stats = {
    devices: [],
}

lr.on('error', function (err) {
    // 'err' contains error object
});

lr.on('line', function (line) {
    if (firstLine) {
        firstLine = false;
        return;
    }

    var cols = line.split(sep);
    //console.log(cols[0], cols[1],cols[2], cols[3], cols[4]);

    if (cols[3] == '""') {
        cols[3] = '0.0';
    }

    cols.forEach(function (v, i, a) {
        a[i] = v.replace(replace, '');
    });
    var id = cols[0];
    var sensor = parseInt(cols[1]);
    var date = cols[2];
    var duration = parseFloat(cols[3]);
    var device = parseInt(cols[4]);

    var D_ID = 'D_' + device;

    if (stats.devices[D_ID]) {
        stats.devices[D_ID]++;
        //console.log(id, sensor, date, duration, device);
    }
    else {
        stats.devices[D_ID] = 1;
    }
});

lr.on('end', function () {
    console.timeEnd('reading file');
    var min = Infinity, max = -Infinity, sum = 0, count = 0;

    Object.keys(stats.devices).forEach(function(key) {
        var v = stats.devices[key];
        // console.log(key, v);

        count++;
        sum += v;
        if (max < v) max = v;
        if (min > v) min = v;

    });
    console.log("Stats")
    console.log(count, sum / count, min, max);
});


// https://stackoverflow.com/questions/6156501/read-a-file-one-line-at-a-time-in-node-js

// var lineReader = require('readline').createInterface({
//     input: require('fs').createReadStream(inputFile)
// });

// lineReader
//     .on('line', function (line) {
//         console.log('Line from file:', line);
//     });

// https://technology.amis.nl/2017/02/09/nodejs-reading-and-processing-a-delimiter-separated-file-csv/

// var parser = parse({delimiter: ';'}, function (err, data) {
//     console.log(data[0]);
//     throw "Cannot";
//     data.forEach(function(line) {
//         console.log(line);
//     });    
// });

// read the inputFile, feed the contents to the parser
//fs.createReadStream(inputFile).pipe(parser);


// var output = [];
// // Create the parser
// var parser = parse({delimiter: ';'});
// // Use the writable stream api
// parser.on('readable', function(){
//   while(record = parser.read()){
//     output.push(record);
//     console.log('.');
//     break;
//   }
// });

// var parser = parse({
//     delimiter: ','
// }, function (err, data) {
//     console.log("Data", data);
//   async.eachSeries(data, function (line, callback) {
//     console.log(line);
//     // do something with the line
//     doSomething(line).then(function() {
//       // when processing finishes invoke the callback to move to the next one
//       callback();
//     });
//   })
// });
// fs.createReadStream(inputFile).pipe(parser);

// https://www.npmjs.com/package/fast-csv

// var stream = fs.createReadStream(inputFile);

// var csvStream = fastcsv()
//     .on("data", function(data){
//          console.log(data);
//     })
//     .on("end", function(){
//          console.log("done");
//     })
//     .on("error", function(err){
//         console.log(err);

//    });

// stream.pipe(csvStream);