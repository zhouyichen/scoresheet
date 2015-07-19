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

function generate(){
    var generator = new PDFGenerator();
    // generateEmpty('333', 3, 5, 12, 'FYO2015', generator);
    if (xlsxArray) {
        generateFirstRounds(xlsxArray, generator, true);
    }
    else {
        alert("Please choose a file");
    }
}

function generateFirstRounds(fileArray, generator, groupByPlayer) {
    var regList = fileArray.Registration;
    var events = _.filter(regList[2], function (entry) {
        return _.contains(_.keys(eventNames), entry);
    });
    var competitionName = getCompetitionName(regList);
    var fileName = competitionName + ' First Rounds';
    var competitiors = getCompetitors(regList);
    var numberOfAttempts = getNumberOfAttempts(_.omit(fileArray, 'Registration'));
    
    var groupByPlayer = true; // default

    if (groupByPlayer == true) {
        generateByPlayer(regList, events, numberOfAttempts, generator);
    }
    else { // group by events
        generateByEvent(regList, events, numberOfAttempts, generator);   
    }
    console.log(generator);
    generator.generatePDF(fileName);
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
        var eventAttemps = getNumberOfAttemptsForRound (val, key);
        var e = eventAttemps.name;
        var attempts = eventAttemps.number;
        if (!numberOfAttempts[e]) {
            numberOfAttempts[e] = attempts;
        }
    });
    return numberOfAttempts;
}

/**
 * get the number of attempts of a event for a particular round on a sheet
 * @param  {Excel sheet} sheet [description]
 * @param  {String} name  the name of the sheet
 * @return {[String, int]}   The name of the event, and the number of attempts
 */
function getNumberOfAttemptsForRound (sheet, name) {
    var header = sheet[3];
    var attempts;
    var e = name.slice(0, -2);
    if (e != '333mbf') {
        if (header[8] == '5') {
            attempts = 5;
        }
        else if (header[6] == '3') {
            attempts = 3;
        }
        else if (header[5] == '2') {
            attempts = 2;
        }
        else {
            attempts = 1;
        }
    } else { // the event is 333mbf
        if (header[12] == '# tried or DNS') {
            attempts = 3;
        }
        else if (header[8] == '# tried or DNS') {
            attempts = 2;
        }
        else {
            attempts = 1;
        }
    }
    return {name: e, number: attempts};
}

function generateByPlayer(regList, events, numberOfAttempts, generator) {
    _.each(_.rest(regList, 3), function (row) {
        for (var e in events) {
            if (events[e] == '333fm'){
                continue;
            }
            if (row[Number(e) + 7] == '1') {
                generator.addScoresheet(row[1], row[0], events[e], 1, numberOfAttempts[events[e]]);
            }
        }
    });
}

function generateByEvent(regList, events, numberOfAttempts, generator) {
    generateByPlayer(regList, events, numberOfAttempts, generator);
    generator.five = _.sortBy(generator.five, 'Event');
    generator.three = _.sortBy(generator.three, 'Event');
    generator.two = _.sortBy(generator.two, 'Event');
    generator.one = _.sortBy(generator.one, 'Event');
}

function generateByRound(eventName, round, sheet, generator) {

}

function generateEmpty(event, round, attempts, number, competitionName, generator) {
    for (var i = 0; i < number; i++) {
        generator.addScoresheet('', '', event, round, attempts);
    }
    generator.generatePDF(competitionName +' '+ eventNames[event]+' Round '+round);
}
