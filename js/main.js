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

    '333fm' : 'Fewest Moves' // no need to generate scoresheet for this
};

var A4PtSize = {
    height : 842,
    width : 595
};

var images = [];
var canva;
var ctx;
var scale = 10;


/**
 * Each Scoresheet represents the info on one scoresheet
 * @param {string} player name
 * @param {string} index  
 * @param {string} event  for 333mbf, this will be the number of attempts
 * @param {int} round  the round number
 */
var Scoresheet = function (player, index, event, round) {
    this.Name = player;
    this.ID = index;
    this.Event = event;
    this.Round = round;
}

/**
 * The Generator object is to be passed into the generate pdf function.
 * It stores the scoresheet objects according to the number of attempts
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

function setUpCanvas() {
    canva = document.getElementById("myCanvas");
    ctx = canva.getContext("2d"); 
    ctx.font = "bold " + 35 * scale +"px Helvetica";
}

function generateFirstRounds(fileArray, groupByPlayer) {
    var regList = fileArray.Registration;
    var events = _.filter(regList[2], function (entry) {
        return _.contains(_.keys(eventNames), entry);
    });
    var competitionName = getCompetitionName(regList);
    competitionName += ' First Rounds';
    var competitiors = getCompetitors(regList);
    var numberOfAttempts = getNumberOfAttempts(_.omit(fileArray, 'Registration'));

    setUpCanvas();

    var groupByPlayer = true;

    if (groupByPlayer == true) {
        var generator = generateByPlayer(regList, events, numberOfAttempts);
        generatePDF(generator, competitionName);
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

function getCompetitionName(regList) { return regList[0][0];
}

function getNumberOfAttempts(events) {
    var numberOfAttempts = [];
    _.mapObject(events, function (val, key){
        var header = val[3];
        var attemps;
        var e = key.slice(0, -2);
        if (e != '333mbf') {
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
        } else {
            if (header[12] == '# tried or DNS') {
                attemps = 3;
            }
            else if (header[8] == '# tried or DNS') {
                attemps = 2;
            }
            else {
                attemps = 1;
            }
        }
        if (!numberOfAttempts[e]) {
            numberOfAttempts[e] = attemps;
        }
    });
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
                var scoresheet = new Scoresheet(row[1], row[0], eventNames[events[e]], 'Round ' + 1);
                if (events[e] == '333mbf') {
                    // change the event attribute to number of attempes instead for mbf
                    scoresheet.event = numberOfAttempts[events[e]];
                    generator.mbf.push(scoresheet);
                }
                else {
                    switch(numberOfAttempts[events[e]]) {
                        case 5:
                            (generator.five).push(scoresheet);
                            break;
                        case 3:
                            (generator.three).push(scoresheet);
                            break;
                        case 2:
                            (generator.two).push(scoresheet);
                            break;
                        case 1:
                            (generator.one).push(scoresheet);
                            break;
                    }
                }
            }
        }
    });
    return generator;
}


var AttemptsSettings = function (number, sheetPerPage) {
    this.number = number,
    this.sheetPerPage = sheetPerPage,
    this.headerPlus = (A4PtSize.height / sheetPerPage - (25 * (number + 2)) - 5) / 2 - 30;
    this.attempsPlus = this.headerPlus + 55;
}

var fiveAttemptsSettings = new AttemptsSettings(5, 4);
var threeAttemptsSettings = new AttemptsSettings(3, 5);
var twoAttemptsSettings = new AttemptsSettings(2, 6);
var oneAttemptSettings = new AttemptsSettings(1, 8);


function generatePDF(generator, competitionName) {
    var doc = new jsPDF('p', 'pt');

    var firstPage = true;
    if (generator.five.length > 0){
        firstPage = false;
        generateByAttempts(generator.five, doc, fiveAttemptsSettings);
    }
    if (generator.three.length > 0){
        if (!firstPage) { doc.addPage();}
        else {firstPage = false;}
        generateByAttempts(generator.three, doc, threeAttemptsSettings);
    }
    if (generator.two.length > 0){
        if (!firstPage) { doc.addPage();}
        else {firstPage = false;}
        generateByAttempts(generator.two, doc, twoAttemptsSettings);
    }
    if (generator.one.length > 0){
        if (!firstPage) { doc.addPage();}
        else {firstPage = false;}
        generateByAttempts(generator.one, doc, oneAttemptSettings);
    }
    if (generator.mbf.length > 0){
        if (!firstPage) { doc.addPage();}
        else {firstPage = false;}
        switch ((generator.mbf)[0].event) {
            case 3:
                generateMBFByAttempts(generator.mbf, doc, threeAttemptsSettings);
                break;
            case 2:
                generateMBFByAttempts(generator.mbf, doc, twoAttemptsSettings);
                break;
            case 1:
                generateMBFByAttempts(generator.mbf, doc, oneAttemptSettings);
                break;
        }  
    }
    doc.save(competitionName+' Scoresheets.pdf');
}

function generateByAttempts(generator, doc, settings) {
    var data = [];
    for (var a = 1; a <= settings.number; a++) {
        data.push({'attempt' : a});
    }
    var counter = 0;
    var y;
    for (var scoresheet in generator) {
        if (counter == settings.sheetPerPage) {
            counter = 0;
            doc.addPage();
        }
        y = counter * A4PtSize.height / settings.sheetPerPage;
        doc.line(0, y, A4PtSize.width, y);
        var sc = generator[scoresheet];
        doc.autoTable(header, [sc], headerOptions(doc, y, settings.headerPlus));
        doc.autoTable(columns, data, attemptsOptions(doc, y, settings.attempsPlus, headerSpacing));
        counter++;
    }
    for (var i = counter; i < settings.sheetPerPage; i++) {
        var sc = [];
        sc.Round = 'Round';
        y = i * A4PtSize.height / settings.sheetPerPage;
        doc.line(0, y, A4PtSize.width, y);
        doc.autoTable(header, [sc], headerOptions(doc, y, settings.headerPlus));
        doc.autoTable(columns, data, attemptsOptions(doc, y, settings.attempsPlus, headerSpacing));
    }
}

function generateMBFByAttempts(generator, doc, settings) {
    var data = [];
    for (var a = 1; a <= settings.number; a++) {
        data.push({'attempt' : a});
    }
    var counter = 0;
    var y;

    for (var scoresheet in generator) {
        if (counter == settings.sheetPerPage) {
            counter = 0;
            doc.addPage();
        }
        y = counter * A4PtSize.height / settings.sheetPerPage;
        doc.line(0, y, A4PtSize.width, y);
        var sc = generator[scoresheet];
        sc.Event = '3×3 Multi-BF';
        doc.autoTable(header, [sc], headerOptions(doc, y, settings.headerPlus));
        doc.autoTable(MBFcolumns, data, attemptsOptions(doc, y, settings.attempsPlus, MBFHeaderSpacing));
        counter++;
    }
    for (var i = counter; i < settings.sheetPerPage; i++) {
        var sc = [];
        sc.Event = '3×3 Multi-BF';
        sc.Round = 'Round';
        y = i * A4PtSize.height / settings.sheetPerPage;
        doc.line(0, y, A4PtSize.width, y);
        doc.autoTable(header, [sc], headerOptions(doc, y, settings.headerPlus));
        doc.autoTable(MBFcolumns, data, attemptsOptions(doc, y, settings.attempsPlus, MBFHeaderSpacing));
    }
}

var header = [
    {key: 'ID', width : 28},
    {key: 'Name', width : 360},
    {key: 'Event', width : 122},
    {key: 'Round', width : 65}
];

var columns = [
    {title: ' ', key: 'attempt', width : 5},
    {title: 'Displayed Time', key: 'time', width : 130}, 
    {title: 'Inspection', key: 'in', width : 45},
    {title: 'Starting', key: 'start', width : 45}, 
    {title: 'Stopping', key: 'stop', width : 45},
    {title: 'Solved State', key: 'ss', width : 55},
    {title: 'Final Result', key: 'result', width : 130}, 
    {title: 'Judge Sign', key: 'js', width : 60}, 
    {title: 'Player Sign', key: 'ps', width : 60}
];

var MBFcolumns = [
    {title: ' ', key: 'attempt', width : 5},
    {title: 'Displayed Time', key: 'time', width : 124},
    {title: 'Starting', key: 'start', width : 34}, 
    {title: 'Stopping', key: 'stop', width : 38},
    {title: 'Solved State', key: 'ss', width : 53},
    {title: 'Completed/Attempted', key: 'ca', width : 91},
    {title: 'Final Result', key: 'result', width : 124}, 
    {title: 'Judge Sign', key: 'js', width : 52},
    {title: 'Player Sign', key: 'ps', width : 52}
];

function headerOptions(doc, yStart, yPlus) {
    padding = 0;
    var leftAndRight = 10;
    var topAndBottom = 10;
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
        startY : yStart + yPlus,
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
            x += 1;
            y += settings.lineHeight / 2 + doc.internal.getLineHeight() / 2 - 2.5;
            if (key == 'Name' && containsSpecial(value)){
                var imgData;
                if (localStorage.getItem(value)) {
                    imgData = localStorage.getItem(value);
                }
                else {
                    ctx.scale(1/scale, 1/scale);
                    ctx.fillText(value, 5 * scale, 40 * scale);
                    ctx.scale(scale, scale);
                    imgData = canva.toDataURL(value+'/png');
                    localStorage.setItem(value, imgData);
                }
                ctx.clearRect (0 , 0 , canva.width, canva.height);
                doc.addImage(imgData, 'PNG', x + settings.padding - 1, y - 16, 4 * canva.width/scale, 4 * canva.height/scale);
            }
            else {
                if (value) {
                    doc.text('' + value, x + settings.padding, y);
                }
                else {
                    doc.setTextColor(223);
                    doc.text('' + key, x + settings.padding, y);
                    doc.setTextColor(0);
                }
                
            }
        }
    };
}

function attemptsOptions(doc, yStart, yPlus, headerSpacing) {
    padding = 0;
    var leftAndRight = 10;
    var topAndBottom = 10;
    return {
        margins : {
            left : leftAndRight,
            right : leftAndRight,
        },
        startY: yStart + yPlus,
        lineHeight : 25,
        renderHeaderCell: function (x, y, width, height, key, value, settings) {
            doc.setFillColor(255);
            doc.setTextColor(0);
            doc.rect(x, y, width, height, 'S');
            x = headerSpacing(x, key, doc);
            y += settings.lineHeight / 2 + doc.internal.getLineHeight() / 2 - 1;
            doc.text('' + value, x, y);
            doc.setFontSize(7);
        },
        renderCell: function (x, y, width, height, key, value, row, settings) {
            doc.setFontSize(9);
            doc.setFillColor(row % 2 === 0 ? 245 : 255);
            doc.rect(x, y, width, height, 'B');
            y += settings.lineHeight / 2 + doc.internal.getLineHeight() / 2 - 2.5;
            if (key == 'ca'){
                doc.text('/', x + 43, y);
            } else {
                doc.text('' + value, x + settings.padding, y);
            }
        }
    };
}

function headerSpacing(x, key, doc) {
    switch (key) {
        case 'start':
            x += 3;
        case 'stop':
            x += 2;
        case 'in':
        case 'ss':
            doc.setFontSize(8);
            x += 5;
            break;
        case 'result':
            x += 9;
        case 'time':
            x += 22;
            doc.setFontSize(11);
            break;
        case 'js':
        case 'ps':
            doc.setFontSize(8.5);
            x += 8;
            break;
    }
    return x;
}

function MBFHeaderSpacing(x, key, doc) {
    switch (key) {
        case 'ca':
            x += 1;
        case 'start':
        case 'stop':
        case 'ss':
            x += 6;
            doc.setFontSize(7.5);
            break;
        case 'result':
            x += 9;
        case 'time':
            x += 21;
            doc.setFontSize(11);
            break;
        case 'js':
        case 'ps':
            doc.setFontSize(8.5);
            x += 5;
            break;
    }
    return x;    
}
