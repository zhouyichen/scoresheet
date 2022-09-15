function urlParam(name){
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    return results[1] || 0;
}

const hash = window.location.hash.slice(1, window.location.hash.length - 1);
const hashParams = new URLSearchParams(hash);
if (hashParams.has('access_token')) {
    this.wca_token = hashParams.get('access_token');
}
console.log('wca_token:' + wca_token);

$.ajax({
    url: "https://www.worldcubeassociation.org/api/v0/competitions/SingaporeMini2022/wcif",
    type: "GET",
    headers: {'Authorization': 'Bearer ' + wca_token, 'Content-Type': 'application/json'},
    success: function(data, status){
        console.log(data)       
    },
    error: function (error) {
        console.log(error)       
    }
});

$('#generateEmpty').mouseup(function (){
    generateEmptyScoresheet();
});

$(function(){
    // $('#generate').mouseup(function (){
    //     generate();
    // });

    function generate(){
        if (xlsxArray) {
            generateFirstRounds(xlsxArray, isGroupByPlayer());
        }
        else {
            alert("Please choose a file");
        }
    }

    function isGroupByPlayer(){
        return ($('input[name=grouping]:checked', '#grouping').val() == "groupByPlayer");
    }

    function generateFirstRounds(fileArray, groupByPlayer) {
        var generator = new scoresheetGenerator();
        var regList = fileArray.Registration;
        var events = _.filter(regList[2], function (entry) {
            return _.contains(_.keys(eventNames), entry);
        });
        var competitionName = getCompetitionName(regList);
        var fileName = competitionName + ' First Rounds';
        var competitiors = getCompetitors(regList);
        var numberOfAttempts = getNumberOfAttempts(_.omit(fileArray, 'Registration'));

        if (groupByPlayer) {
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
                    if (events[e] == '333mbf') {
                        generator.addMBFScoresheet(row[1], row[0], 1, numberOfAttempts[events[e]]);
                    } else {
                        generator.addScoresheet(row[1], row[0], eventNames[events[e]], 1, numberOfAttempts[events[e]]);
                    }   
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

    function generateByRound(eventName, round, sheet) {

    }

    function generateEmptyScoresheet() {
        var eventName = $('#selectEvent').find("option:selected").val();
        if (eventName == 'Event') {
            eventName = '';
        }
        var round = $('#selectRound').find("option:selected").val();
        if (round == 'Round'){
            round = '';
        }
        var attemptsString = $('#selectAttempts').find("option:selected").val();
        var attempts;
        if (attemptsString == 'Number of Attempts'){
            attempts = eventDefaults[eventName].attempts;
        } else {
            var attempts = parseInt(attemptsString);
        }
        var number = parseInt($('#copies').val());
        if (!number) {
            number = eventDefaults[eventName].number;
        }
        var competitionName = $('#compName').val();
        if (!competitionName) {
            competitionName = '';
        }
        generateEmpty(eventName, round, attempts, number, competitionName);
    }

    function generateEmpty(eventName, round, attempts, number, competitionName) {
        var generator = new scoresheetGenerator();
        for (var i = 0; i < number; i++) {
            if (eventName != '3×3 Multi-BF') {
                generator.addScoresheet('', '', eventName, round, attempts);
            } else {
                generator.addMBFScoresheet('', '', round, attempts);
            }   
        }
        generator.generatePDF(competitionName +' '+ eventName +' Round '+round);
    }


    function fillEmpty() {
        var eventText = '<option selected="selected">Event</option>';
        for (var i in eventNames) {
            if (i != '333fm'){
                eventText += '<option>' + eventNames[i] + '</option>';
            }
        }
        $('#selectEvent').html(eventText);


        var roundText = '<option>Round</option>';
        for (var i = 1; i <= 4; i++){
            roundText += '<option>' + i + '</option>';
        }
        $('#selectRound').html(roundText);


        var attempts = [5, 3, 2, 1];
        var attemptText = '<option>Number of Attempts</option>';
        for (var i in attempts) {
            attemptText += '<option>' + attempts[i] + '</option>';
        }
        $('#selectAttempts').html(attemptText);
    }
    fillEmpty();
});

