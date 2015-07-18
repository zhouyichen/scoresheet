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

var MBFScoresheet = function (player, index, attempts, round) {
    this.Name = player;
    this.ID = index;
    this.Attempts = attempts;
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

function generate(){
    // generateEmpty('333', 3, 5, 12, 'FYO2015');
    if (xlsxArray) {
        setUpCanvas();
        generateFirstRounds(xlsxArray, true);
    }
    else {
        alert("Please choose a file");
    }
}

function generateFirstRounds(fileArray, groupByPlayer) {
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
        var generator = generateByPlayer(regList, events, numberOfAttempts);
    }
    else { // group by events
        var generator = generateByEvent(regList, events, numberOfAttempts);   
    }
    console.log(generator);
    generatePDF(generator, fileName);
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

function generateByPlayer(regList, events, numberOfAttempts) {
    var generator = new Generator();
    _.each(_.rest(regList, 3), function (row) {
        for (var e in events) {
            if (events[e] == '333fm'){
                continue;
            }
            if (row[Number(e) + 7] == '1') {
                if (events[e] != '333mbf') {
                    // create a new player event
                    var scoresheet = new Scoresheet(row[1], row[0], eventNames[events[e]], 'Round ' + 1);
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
                else {
                    var scoresheet = new MBFScoresheet(row[1], row[0], numberOfAttempts[events[e]], 'Round ' + 1);
                    generator.mbf.push(scoresheet);
                }
            }
        }
    });
    return generator;
}

function generateByEvent(regList, events, numberOfAttempts) {
    var generator = generateByPlayer(regList, events, numberOfAttempts);
    generator.five = _.sortBy(generator.five, 'Event');
    generator.three = _.sortBy(generator.three, 'Event');
    generator.two = _.sortBy(generator.two, 'Event');
    generator.one = _.sortBy(generator.one, 'Event');
    return generator;
}

function generateByRound(eventName, round, sheet, generator) {

}

function generateEmpty(event, round, attempts, number, competitionName) {
    var generator = new Generator();
    var scoresheet = new Scoresheet('', '', eventNames[event], 'Round '+round);
    var scoresheets = [];
    if (event != '333mbf') {
        for (var i=0; i<number; i++){
            scoresheets.push(scoresheet);
        }
        switch(attempts) {
            case 5:
                generator.five=scoresheets;
                break;
            case 3:
                generator.three=scoresheets;
                break;
            case 2:
                generator.two=scoresheets;
                break;
            case 1:
                generator.one=scoresheets;
                break;
        }        
    } else {
        scoresheet.Event = attempts;
        for (var i = 0; i < number; i++){
            scoresheets.push(scoresheet);
        }
        generator.mbf=scoresheets;
    }
    generatePDF(generator, competitionName +' '+ eventNames[event]+' Round '+round);
}

