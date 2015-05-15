var xlf = document.getElementById('xlf');

var eventNames = {
    '222' : '2×2 Cube',
    '333' : '3×3 Cube',
    '444' : '4×4 Cube',
    '555' : '5×5 Cube',
    '666' : '6×6 Cube',
    '777' : '7×7 Cube',
    '333bf' : '3×3 BF',
    '444bf' : '4×4 BF',
    '555bf' : '5×5 BF',
    '333oh' : '3×3 OH',
    '333ft' : '3×3 Feet',
    'minx' : 'Megaminx',
    'pyram' : 'Pyraminx',
    'sq1' : 'Square-1',
    'clock' : 'Clock',
    'skewb' : 'Skewb',

    '333mbf' : "3×3 Multi-BF", // special scoresheet for this

    '333fm' : 'Fewest Moves' // no need to generate score sheet for this
}

var PlayerEvent = function (player, index, event, round) {
    this.player = player;
    this.index = index;
    this.event = event;
    this.round = round;
}

var Generator = function () {
    this.five = [];
    this.three = [];
    this.two = [];
    this.one = [];
    this.mbf = [];
}

function handleFile(e) {
    var files = e.target.files;
    var file = files[0];
    process(file);
}

xlf.addEventListener('change', handleFile, false);

function process(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var data = e.target.result;
        var arr = fixdata(data);
        var wb = XLSX.read(btoa(arr), {type: 'base64'});
        console.log(wb);
        var array = to_array(wb);
        generateFirstRounds(array, true);
    };
    reader.readAsArrayBuffer(file);
}

function fixdata(data) {
    var o = "", l = 0, w = 10240;
    for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
    o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
    return o;
}

function to_array(workbook) {
    var result = [];
    workbook.SheetNames.forEach(function(sheetName) {
        var csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        array = csv.csvToArray({rSep:'\n'});
        console.log(csv);
        if(csv.length > 0){
            result[sheetName] = array;
        }
    });
    return result;
}

function generateFirstRounds(fileArray, groupByPlayer) {
    var regList = fileArray.Registration;
    var events = _.filter(regList[2], function (entry) {
        return _.contains(_.keys(eventNames), entry);
    });
    var competitiors = getCompetitors(regList);
    var numberOfAttempts = getNumberOfAttempts(_.omit(fileArray, 'Registration'));
    var groupByPlayer = true;
    if (groupByPlayer == true) {
        var generator = generateByPlayer(regList, events, numberOfAttempts);
        generatePDF(generator);
        console.log(generator);
    }
    else { // group by events

    }
}

function getCompetitors(regList) {
    var competitors = _.map(_.rest(regList, 3), function(row) {
        return _.first(row, 2);
    });
    return competitors;
}

function getNumberOfAttempts(events) {
    var numberOfAttempts = [];
    _.mapObject(events, function (val, key){
        var header = val[3];
        var attemps;
        if (header[8] == '5') {
            attemps = 5;
        }
        else if (header[6] == '3') {
            attemps = 3;
        }
        else if (header[5] == '2') {
            attemps = 2;
        }
        else {
            attemps = 1;
        }
        if (!numberOfAttempts[key.slice(0, -2)]) {
            numberOfAttempts[key.slice(0, -2)] = attemps;
        }
    });
    console.log(numberOfAttempts);
    return numberOfAttempts;
}

function generateByPlayer(regList, events, numberOfAttempts) {
    var generator = new Generator();
    _.each(_.rest(regList, 3), function (row) {
        for (var e in events) {
            if (events[e] == '333fm'){
                continue;
            }
            if (row[Number(e) + 7] == '1') {
                // create a new player event
                var playerEvent = new PlayerEvent(row[1], row[0], events[e], 1);
                if (events[e] == '333mbf') {
                    // change the event attribute to number of attempes instead for mbf
                    playerEvent.event = numberOfAttempts[events[e]];
                    generator.mbf.push(playerEvent);
                }
                else {
                    switch(numberOfAttempts[events[e]]) {
                        case 5:
                            (generator.five).push(playerEvent);
                            break;
                        case 3:
                            (generator.three).push(playerEvent);
                            break;
                        case 2:
                            (generator.two).push(playerEvent);
                            break;
                        case 1:
                            (generator.one).push(playerEvent);
                            break;
                    }
                }
            }
        }
    });
    return generator;
}

function generatePDF(generator) {

}



