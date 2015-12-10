var csvInput = document.getElementById('csv');
csvInput.addEventListener('change', readFile, false);
var regList;
var events;

function readFile (evt) {
    var files = evt.target.files;
    var file = files[0];           
    var reader = new FileReader();
    reader.onload = function() {
        var csv = this.result;
        regList = csv.csvToArray({rSep:'\n'});      
        var headerRow = regList[0]
        events = headerRow.slice(6, -3);
        attempsHTML();
    }
    reader.readAsText(file);
}


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
            console.log(eventName, numberOfAttempts);
            results[eventCode] = numberOfAttempts;
        }
    });
    return results;
}

