var csvInput = document.getElementById('csv');
csvInput.addEventListener('change', readFile, false);
var regList;
var events;

function isGroupByPlayer(){
    return ($('input[name=grouping]:checked', '#grouping').val() == "groupByPlayer");
}

function readFile (evt) {
    var files = evt.target.files;
    var file = files[0];           
    var reader = new FileReader();
    reader.onload = function() {
        var csv = this.result;
        regList = csv.csvToArray({rSep:'\n'});
        var headerRow = regList[0];
        events = headerRow.slice(6, -3);
        attempsHTML();
    }
    reader.readAsText(file);
}

$(function(){
    $('#generate').mouseup(function (){
        var generator = new scoresheetGenerator();
        var numberOfAttempts = getNumberOfAttempts();
        if (isGroupByPlayer()) {
            generateByPlayer(events, numberOfAttempts, generator);
        }
        else { // group by events
            generateByEvent(events, numberOfAttempts, generator);   
        }
        generator.generatePDF('First Round Scoresheets');
    });
});


function attempsHTML() {
    var HTML = '<h4 style="margin-left:15px">Please select the number of attempts for the events:</h4>';
    _.each(events, function (eventCode) {
        if (eventCode != '333fm') {
            var eventName = eventNames[eventCode];
            var maxAttempts = eventDefaults[eventName].maxAttempts;
            var attempts = [5, 3, 2, 1];
            if (maxAttempts == 3) {
                attempts = [3, 2, 1];
            }
            var attemptOptions = '';
            for (var i in attempts) {
                attemptOptions += '<option>' + attempts[i] + '</option>';
            }
            var options = "<select class='form-control' id='"+ eventCode +"'>" + attemptOptions + "</select>";
            HTML += "<div class='col-sm-2 col-xs-4'>" + eventName + options + "</div>";
        }
    });
    $('#numberOfAttempts').html(HTML);
}


function getNumberOfAttempts() {
    results = {}
    _.each(events, function (eventCode) {
        if (eventCode != '333fm') {
            var eventName = eventNames[eventCode];
            var numberOfAttempts = parseInt($('#'+eventCode).find("option:selected").val());
            results[eventCode] = numberOfAttempts;
        }
    });
    return results;
}

function generateByPlayer(events, numberOfAttempts, generator) {
    _.each(_.rest(regList, 1), function (row, id) {
        id += 1;
        for (var e in events) {
            var eventCode = events[e];
            if (eventCode == '333fm'){
                continue;
            }
            if (row[Number(e) + 6] == '1') {
                if (eventCode == '333mbf') {
                    generator.addMBFScoresheet(row[1], id, 1, numberOfAttempts[eventCode]);
                } else {
                    generator.addScoresheet(row[1], id, eventNames[eventCode], 1, numberOfAttempts[eventCode]);
                }   
            }
        }
    });
}

function generateByEvent(events, numberOfAttempts, generator) {
    generateByPlayer(events, numberOfAttempts, generator);
    generator.five = _.sortBy(generator.five, 'Event');
    generator.three = _.sortBy(generator.three, 'Event');
    generator.two = _.sortBy(generator.two, 'Event');
    generator.one = _.sortBy(generator.one, 'Event');
}
