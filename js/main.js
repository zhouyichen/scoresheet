var xlf = document.getElementById('xlf');

var eventNames = {
    '222' : '2×2 Cube',
    '333' : "Rubik's Cube",
    '444' : '4×4 Cube',
    '555' : '5×5 Cube',
    '666' : '6×6 Cube',
    '777' : '7×7 Cube',
    '333bf' : '3×3 Blindfolded',
    '444bf' : '4×4 Blindfolded',
    '555bf' : '5×5 Blindfolded',
    '333oh' : '3×3 One-Handed',
    '333ft' : '3×3 With Feet',
    'minx' : 'Megaminx',
    'pyram' : 'Pyraminx',
    'sq1' : 'Square-1',
    'clock' : 'Clock',
    'skewb' : 'Skewb',

    '333mbf' : '3×3 Multi-BF', // special scoresheet for this

    '333fm' : 'Fewest Moves' // no need to generate score sheet for this
}

var A4PtSize = {
    height : 842,
    width : 595
};

var canva = document.getElementById("myCanvas");
var ctx;
var scale = 10;

ctx = canva.getContext("2d"); 
ctx.font = "bold " + 35 * scale +"px Helvetica";


/**
 * Each playerEvent represents the info on one scoresheet
 * @param {string} player name
 * @param {string} index  
 * @param {string} event  for 333mbf, this will be the number of attempts
 * @param {int} round  the round number
 */
var PlayerEvent = function (player, index, event, round) {
    this.player = player;
    this.index = index;
    this.event = event;
    this.round = round;
}

/**
 * The Generator object is to be passed into the generate pdf function.
 * It stores the playerEvent objects according to the number of attempts
 */
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
        var array = to_array(wb);
        generateFirstRounds(array, true);
    };
    reader.readAsArrayBuffer(file);
}

function fixdata(data) {
    var o = '', l = 0, w = 10240;
    for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
    o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
    return o;
}

function to_array(workbook) {
    var result = [];
    workbook.SheetNames.forEach(function(sheetName) {
        var csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        array = csv.csvToArray({rSep:'\n'});
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
        var e = key.slice(0, -2);
        if (!numberOfAttempts[e]) {
            numberOfAttempts[e] = attemps;
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
                var playerEvent = new PlayerEvent(row[1], row[0], eventNames[events[e]], 'Round ' + 1);
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

var header = [
    {key: 'index', width : 30},
    {key: 'player', width : 340}, 
    {key: 'event', width : 140},
    {key: 'round', width : 65} 
];

var columns = [
    {title: ' ', key: 'attempt', width : 8},
    {title: 'Displayed Time', key: 'time', width : 130}, 
    {title: 'Inspection', key: 'in', width : 45},
    {title: 'Starting', key: 'start', width : 43}, 
    {title: 'Stopping', key: 'stop', width : 44},
    {title: 'Solved State', key: 'ss', width : 55},
    {title: 'Final Result', key: 'result', width : 130}, 
    {title: 'Judge Sign', key: 'js', width : 60}, 
    {title: 'Player Sign', key: 'ps', width : 60}
];

function generatePDF(generator) {
    var fiveAttempts = generator.five;
    var data = [];
    for (var a = 1; a <= 5; a++) {
        data.push({'attempt' : a});
    }

    // var dd = {
    //     content: [
    //         'First 中文 paragraph',
    //         'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
    //     ]
    // };
    // pdfMake.createPdf(dd).open();
    // 
    var doc = new jsPDF('p', 'pt');
    var counter = 0;
    for (var scoresheet in fiveAttempts) {
        y = counter * A4PtSize.height / 4;
        doc.line(0, y, A4PtSize.width, y);
        doc.autoTable(header, [fiveAttempts[scoresheet]], headerOptions(doc, y));
        doc.autoTable(columns, data, fiveAttemptsOptions(doc, y));
        counter++;
        if (counter == 4) {
            counter = 0;
            doc.addPage();
        }
    }
    doc.save('table.pdf');

}

var not = true;

function headerOptions(doc, yStart) {
    padding = 0;
    var leftAndRight = 10;
    var topAndBottom = 10;
    function callback (a, b, c, d) {
        console.log(a, b, c, d);
    }
    function containsSpecial(string){
        var allowed = 'abcdefghijklmnopqrstuvwxyz' +
                      'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                      "1234567890 ×-'";
        return _.some(string, function(char) {
            return !_.contains(allowed, char);
        });
    }
    return {
        lineHeight : 25,
        margins : {
            left : leftAndRight,
            right : leftAndRight,
        },
        startY : yStart - 15,
        renderHeaderCell: function (x, y, width, height, key, value, settings) {
            // do nothing
        },
        renderCell: function (x, y, width, height, key, value, row, settings) {
            doc.setFontSize(10);
            doc.setFont("helvetica");
            doc.setFillColor(255);
            doc.rect(x, y, width, height, 'S');
            doc.setFontStyle('bold');
            doc.setFontSize(14);
            x += 2;
            y += settings.lineHeight / 2 + doc.internal.getLineHeight() / 2 - 2.5;
            var specialElementHandlers = {
                '#editor': function(element, renderer){
                    return true;
                }
            };

            if (key == 'player' && containsSpecial(value)){
                ctx.scale(1/scale, 1/scale);
                ctx.fillText(value, 5 * scale, 40 * scale);
                ctx.scale(scale, scale);
                var imgData = canva.toDataURL('image/png');
                ctx.clearRect (0 , 0 , canva.width, canva.height);
                doc.addImage(imgData, 'PNG', x + settings.padding - 1, y - 16, 4 * canva.width/scale, 4 * canva.height/scale);
            }
            else {
                doc.text('' + value, x + settings.padding, y);
            }
            // doc.addHTML('' + value, x + settings.padding, y, {}, callback);
        }

    };
}

function fiveAttemptsOptions(doc, yStart) {
    padding = 0;
    var leftAndRight = 10;
    var topAndBottom = 10;
    var attemptHeight = 30;
    return {
        margins : {
            left : leftAndRight,
            right : leftAndRight,
        },
        startY: yStart + 40,
        lineHeight : 25,
        renderHeaderCell: function (x, y, width, height, key, value, settings) {
            doc.setFillColor(255);
            doc.setTextColor(0);

            doc.rect(x, y, width, height, 'S');
            switch (key) {
                case 'start':
                    x += 2
                case 'stop':
                    x += 2
                case 'in':
                case 'ss':
                    doc.setFontSize(8);
                    x += 5;
                    break;
                case 'result':
                    x += 12;
                case 'time':
                    x += 18;
                    doc.setFontSize(11);
                    break;
                case 'js':
                case 'ps':
                    doc.setFontSize(8.5);
                    x += 7;
                    break;
            }
            y += settings.lineHeight / 2 + doc.internal.getLineHeight() / 2 - 1;
            doc.text('' + value, x, y);
            doc.setFontSize(8);
        },
        renderCell: function (x, y, width, height, key, value, row, settings) {
            doc.setFontSize(9);
            doc.setFillColor(row % 2 === 0 ? 245 : 255);
            doc.rect(x, y, width, height, 'B');
            y += settings.lineHeight / 2 + doc.internal.getLineHeight() / 2 - 2.5;
            doc.text('' + value, x + settings.padding, y);
        }

    };
}




