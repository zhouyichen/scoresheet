
function urlParam(name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    return results[1] || 0;
}

const hash = window.location.hash.slice(1, window.location.hash.length - 1);
const hashParams = new URLSearchParams(hash);
if (hashParams.has('access_token')) {
    var wca_token = hashParams.get('access_token');
}
console.log('wca_token:' + wca_token);


$(function(){
    var wcifData;

    $('#generateFirstRounds').mouseup(function () {
        generateFirstRounds(wcifData);
    });

    $('#generateEmpty').mouseup(function () {
        generateEmptyScoresheet();
    });

    $('#reg_csv').mouseup(function () {
        downloadRegCSV(wcifData);
    });


    var managedComps;
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateString = oneMonthAgo.toISOString();
    $.ajax({
        url: "https://www.worldcubeassociation.org/api/v0/competitions/?managed_by_me=true&start=" + dateString,
        type: "GET",
        headers: { 'Authorization': 'Bearer ' + wca_token, 'Content-Type': 'application/json' },
        success: function (data, status) {
            console.log(data);
            managedComps = data;
            displayComps(managedComps);
            $('#wca').hide();
        },
        error: function (error) {
            console.log(error)       
        }
    });


    function downloadRegCSV(wcifData) {
        var string = 'data:text/csv;charset=utf-8, ID,Name,Email';
        var event_to_idx = {};
        wcifData.events.forEach(function (event, index) {
            var eventID = event.id;
            string += ',' + eventID;
            event_to_idx[eventID] = index;
        })
        string += '\n';
        for (const person of wcifData.persons) {
            if (person.registration != null && person.registration.status == "accepted") {
                var person_str = person.registrantId + ',' + person.name + ',' + person.email;
                var eventFlags = Array(event_to_idx.length).fill(0);
                for (const event of person.registration.eventIds) {
                    eventFlags[event_to_idx[event]] = 1;
                }
                for (const eventFlag of eventFlags) {
                    var eventStr = '';
                    if (eventFlag === 1) {
                        eventStr = '1'
                    }
                    person_str += ',' + eventStr;
                }
                string += person_str + '\n';
            }
        }
        var encodedUri = encodeURI(string);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", wcifData.id+"_registration.csv");
    
        link.click();
    }

    function displayComps(managedComps) {
        var compsSelectHTML = '<form class="input-group" id="compSelect">';
        var compsText = '<option selected="selected">Select Competition</option>';
        for (const comp of managedComps) {
            const compName = comp.name;
            const compId = comp.id;
            var compStr = '<option value="' + compId + '"> ' + compName + '</option>'
            compsText += compStr;
        }
        compsSelectHTML += "</form>";
        $('#competitions').html(compsText);
    
        const buttonText = '<button type="button" class="btn btn-default" id=\'fetchComp\'> Fetch compeition data</button>';
        $('#selectButton').html(buttonText);
        
        
        $('#fetchComp').mouseup(function () {
            const compId = $('#competitions option:selected').val();
            const compName = $('#competitions option:selected').text();
            $('#compTitle').html("Generate Scoresheets for " + compName);
            $.ajax({
                url: "https://www.worldcubeassociation.org/api/v0/competitions/" + compId + "/wcif",
                type: "GET",
                headers: { 'Authorization': 'Bearer ' + wca_token, 'Content-Type': 'application/json' },
                success: function (data, status) {
                    console.log(data);
                    wcifData = data;
                    processCompData(wcifData);
                    console.log(wcifData);
                    $('#beforeSelect').hide();
                    $('#afterSelect').show();
                },
                error: function (error) {
                    console.log(error)       
                }
            });
        });
    }

    function sortByPreRanking(results) {
        results.sort((a, b) => b['preRanking'] - a['preRanking']);
    }

    function generateScoresheetForRounds(wcifData) {
        wcifData.nonFirstRounds.forEach(round => {
            const roundId = round.id;
            const numPlayers = round.results.length;
            $('#b_' + roundId).mouseup(function () {
                const numGroups = $('#g_' + roundId).find("option:selected").val();
                const playersPerGroup = Math.ceil(numPlayers / numGroups);
                var generator = new scoresheetGenerator(wcifData.name);
                var fileName = wcifData.name + " " + roundId;
                const actArray = roundId.split("-");
                const event = actArray[0];
                const roundNum = actArray[1].slice(1);
                const format = wcifData.roundToFormat[roundId];
                const attempts = formats[format].attempts;
                round.results.forEach((res, idx) => {
                    person = wcifData.idToPerson[res.personId];
                    let playerName = person.name;
                    const wcaId = person.wcaId;
                    if (wcaId == null) { // if wcaId is empty, add newcomer
                        playerName = "(new) " + playerName;
                    }
                    const group = Math.floor(idx / playersPerGroup) + 1;
                    generator.addScoresheet(playerName, res.personId, eventNames[event],
                                            roundNum, attempts, group);
                });
                console.log(generator);
                generator.generatePDF(fileName);
            });
        });
    }
    
    function generateButtonsForRounds(wcifData) {
        var allRoundsHTML = "";
        wcifData.nonFirstRounds.forEach(round => {
            const numPlayers = round.results.length;
            if (numPlayers > 0) {
                const roundId = round.id;
                const maxGroups = Math.floor(numPlayers / 8) + 1;
            var buttonText = '<button type="button" class="btn btn-default" id="b_' + roundId
                + '">' + roundId + '</button> with';
            var groupOptions = '';
            for (var g = 1; g < maxGroups + 1; g++) {
                var group_text = ' group';
                if (g > 1) {
                    group_text += 's';
                }
                    groupOptions += '<option value=' + g + '>' + g + group_text + '</option>';
            }
                var options = "<select class='form-control' id='g_" + roundId + "'>" + groupOptions + "</select><br>";
            buttonText = buttonText + options;
            allRoundsHTML += "<div class='col-sm-2 col-xs-4'>" + buttonText + "</div>";
            }
        });
        if (allRoundsHTML.length === 0) {
            allRoundsHTML = "Please open the next round on WCA Live and sync again."
        }
        $('#otherRounds').html(allRoundsHTML);
    
        wcifData.idToPerson = {};
        wcifData.persons.forEach(person => {
            wcifData.idToPerson[person.registrantId] = person;
        });
    
        generateScoresheetForRounds(wcifData);
    }
 
    function populateAssignmentsToActs(wcifData) {
        const printer = new groupingPrinter(wcifData.name);
        for (const person of wcifData.persons) {
            if (person.registration != null && person.registration.status == "accepted") {

                for (const assignment of person.assignments) {
                    const activity = wcifData.activityIdToGroupAll[assignment.activityId];
                    if (activity) {
                        const activityCode = activity.activityCode;
                        const normAct = !activityCode.includes("333mbf-");
                        if (normAct) {
                            const activityCode = activity.activityCode;
                            person.shortName = printer.formatName(person.name);
                            const perconCopy = {...person};
                            perconCopy.staffPrev = false;
                            perconCopy.staffNext = false;
                            perconCopy.competePrev = false;
                            perconCopy.competeNext = false;
                            if (assignment.assignmentCode === "competitor") {
                                wcifData.actCodeToCompetitors[activityCode].push(perconCopy);
                            } else if (assignment.assignmentCode === "staff-judge") {
                                wcifData.actCodeToJudges[activityCode].push(perconCopy);
                            } else if (assignment.assignmentCode === "staff-scrambler") {
                                wcifData.actCodeToScramblers[activityCode].push(perconCopy);

                            }
                        }
                    }
                }
            }
        }
    }


    
    function generateButtonsForGrouping(wcifData) {
        wcifData.actCodeToCompetitors = {};
        wcifData.actCodeToJudges = {};
        wcifData.actCodeToScramblers = {};
        // check the wcif data, for each venue/room, show 3 buttons
        // 1. First rounds only 2. non-first rounds only 3. all rounds
        // for each button, bind a mouseup event to use groupingPrinter class to generate the grouping PDF
        for (const venueIdx in wcifData.schedule.venues) {
            var venue = wcifData.schedule.venues[venueIdx];
            console.log(venue);
            for (const roomIdx in venue.rooms) {
                var room = venue.rooms[roomIdx];
                var roomName = room.name;
                var roomHTML = "<h3>" + roomName + "</h3>";
                // var conciseRoomName = roomName.replace(/ /g, "_");
                //show 3 buttons: 1. First rounds only 2. non-first rounds only 3. all rounds
                var firstRoundsId = "fr_" + venueIdx + "_" + roomIdx;
                var nonFirstRoundsId = "nfr_" + venueIdx + "_" + roomIdx;
                var allRoundsId = "ar_" + venueIdx + "_" + roomIdx;
                var allRoundsTableId = "art_" + venueIdx + "_" + roomIdx;
                roomHTML += '<button type="button" class="btn btn-default" id=' + firstRoundsId + '">First Rounds Only</button>';
                roomHTML += '<button type="button" class="btn btn-default" id=' + nonFirstRoundsId + '">Non-First Rounds Only</button>';
                roomHTML += '<button type="button" class="btn btn-default" id=' + allRoundsId + '">All Rounds</button>';

                roomHTML += '<button type="button" class="btn btn-default" id=' + allRoundsTableId + '">All Rounds Table</button>';
                
                room.firstRoundsActs = [];
                room.nonFirstRoundsActs = [];
                room.allCompetingActs = [];
                var roomActs = room.activities;
                // sort acts by startTime in ascending order
                roomActs.sort((a, b) => a.startTime.localeCompare(b.startTime));

                for (const act of roomActs) {
                    var isCompetingAct = false;
                    if (wcifData.firstRounds.includes(act.activityCode)) {
                        room.firstRoundsActs.push(act);
                        isCompetingAct = true;
                    }
                    if (wcifData.nonFirstRoundIds.includes(act.activityCode)) {
                        room.nonFirstRoundsActs.push(act);
                        isCompetingAct = true;
                    }
                    if (isCompetingAct) {
                        room.allCompetingActs.push(act);
                        for (const group of act.childActivities) {
                            wcifData.actCodeToCompetitors[group.activityCode] = [];
                            wcifData.actCodeToJudges[group.activityCode] = [];
                            wcifData.actCodeToScramblers[group.activityCode] = [];
                        }
                        if (act.childActivities.length === 0) {
                            wcifData.actCodeToCompetitors[act.activityCode] = [];
                            wcifData.actCodeToJudges[act.activityCode] = [];
                            wcifData.actCodeToScramblers[act.activityCode] = [];
                        }
                    }
                }
                $('#groupingButtons').append(roomHTML);
            }
        }

        populateAssignmentsToActs(wcifData);


        // Use event delegation to bind mouseup events
        $('#groupingButtons').on('mouseup', 'button', function () {
            var buttonId = $(this).attr('id');
            var [type, venueIdx, roomIdx] = buttonId.split('_');
            // convert venueIdx and roomIdx to integer
            venueIdx = parseInt(venueIdx);
            roomIdx = parseInt(roomIdx);
            var room = wcifData.schedule.venues[venueIdx].rooms[roomIdx];
            var roomName = room.name;
            var generator = new groupingPrinter(wcifData.name);
            generator.checkStaffGrouping(wcifData);
            var fileName;

            if (type === 'fr') {
                console.log("firstRoundsId clicked");
                fileName = roomName + '_First_Rounds';
                generator.generatePDF(room.firstRoundsActs, wcifData, fileName);
            } else if (type === 'nfr') {
                console.log("nonFirstRoundsId clicked");
                fileName = roomName + '_Non_First_Rounds';
                generator.generatePDF(room.nonFirstRoundsActs, wcifData,  fileName);
            } else if (type === 'ar') {
                console.log("allRoundsId clicked");
                fileName = roomName + '_All_Rounds';
                generator.generatePDF(room.allCompetingActs, wcifData,  fileName);
            } else if (type === 'art') {
                console.log("allRoundsId Table clicked");
                fileName = roomName + '_All_Rounds_table';
                generator.generatePDF(room.allCompetingActs, wcifData,  fileName, tableFormat=true);
            }
        });
    }
    
    function processCompData(wcifData) {
        // get all rounds of the competition
        wcifData.firstRounds = [];
        wcifData.nonFirstRounds = [];
        wcifData.nonFirstRoundIds = [];
        wcifData.roundToFormat = {};
        wcifData.roundIdToCutoff = {};

        wcifData.name = wcifData.shortName;
        for (const event of wcifData.events) {
            if (event.id === "333fm") {
                continue;
            }
            var previousRound = null;
            event.rounds.forEach((round, idx) => {
                if (idx === 0) {
                    wcifData.firstRounds.push(round.id);
                } else {
                    wcifData.nonFirstRounds.push(round);
                    wcifData.nonFirstRoundIds.push(round.id);
                }
                wcifData.roundToFormat[round.id] = round.format;
                if (round.cutoff == null) {
                    if (round.timeLimit != null) {
                        if (round.timeLimit.centiseconds === 60000) {
                            round.timeLimit = null;
                        }
                    }
                }
                wcifData.roundIdToCutoff[round.id] = {'cutoff': round.cutoff, 'timeLimit': round.timeLimit};
                if (previousRound != null) {
                    round.results.forEach((r, idx) => {
                        r['preRanking'] = previousRound.results.filter(pr => pr.personId === r.personId)[0].ranking;
                    });
                    sortByPreRanking(round.results);
                }
                previousRound = round;
            });
        }
    
        // generate HTML for other rounds
        generateButtonsForRounds(wcifData);
    
        // get all groups of the competition
        wcifData.activityIdToGroup = {};
        wcifData.activityIdToGroupAll = {};
        for (const venue of wcifData.schedule.venues) {
            for (const room of venue.rooms) {
                for (const act of room.activities) {
                    // this is a competing round
                    if (wcifData.firstRounds.includes(act.activityCode) || 
                            ((act.activityCode.includes("333mbf-") && (! act.activityCode.includes("a2"))
                              && (! act.activityCode.includes("a3"))))
                        ) {
                        if (act.childActivities.length === 0) {
                            wcifData.activityIdToGroup[act.id] = act;
                            wcifData.activityIdToGroupAll[act.id] = act;
                        }
                        for (const group of act.childActivities) {
                            wcifData.activityIdToGroup[group.id] = group;
                            wcifData.activityIdToGroupAll[group.id] = group;
                        }
                    }
                    if (wcifData.nonFirstRoundIds.includes(act.activityCode) || 
                        ((act.activityCode.includes("333mbf-") && (! act.activityCode.includes("a2"))
                        && (! act.activityCode.includes("a3"))))
                        ) {
                        if (act.childActivities.length === 0) {
                            wcifData.activityIdToGroupAll[act.id] = act;
                        }
                        for (const group of act.childActivities) {
                            wcifData.activityIdToGroupAll[group.id] = group;
                        }
                    }
                }
            }
        }
        generateButtonsForGrouping(wcifData);
    }

    function generateFirstRounds(wcifData) {
        var generator = new scoresheetGenerator(wcifData.name);
        var fileName = wcifData.name + ' First Rounds';

        generateByIdWithGroup(wcifData, generator);
        const grouping = $('input[name=grouping]:checked', '#grouping').val();

        if (grouping == "groupByPlayer") {
            generateByNameWithGroup(wcifData, generator)
        }
        else if (grouping == "groupByEvent") {
            generateByEventGroup(wcifData, generator)
        }
        console.log(generator);
        generator.generatePDF(fileName);
    }



    
    function generateByIdWithGroup(wcifData, generator) {
        for (const person of wcifData.persons) {
            if (person.registration != null && person.registration.status == "accepted") {
                const playerId = person.registrantId;
                let playerName = person.name;
                const wcaId = person.wcaId;
                if (wcaId == null) { // if wcaId is empty, add newcomer
                    playerName = "(new) " + playerName;
                }
                
                if (person.assignments.length === 0) {
                    if (person.registration.isCompeting) {
                        for (const event of person.registration.eventIds) {
                            if (event === '333fm') {
                                continue;
                            }
                            const roundId = event + "-r1";
                            const cutoff = wcifData.roundIdToCutoff[roundId].cutoff;
                            const timeLimit = wcifData.roundIdToCutoff[roundId].timeLimit;
                            const format = wcifData.roundToFormat[roundId];
                            const attempts = formats[format].attempts;
                            if (event === '333mbf') {
                                generator.addMBFScoresheet(playerName, playerId, 1, attempts);
                            } else {
                                generator.addScoresheet(playerName, playerId, eventNames[event],
                                                1, attempts, "", cutoff, timeLimit);
                            }
                        }
                    }
                }
                for (const assignment of person.assignments) {
                    if (assignment.assignmentCode === "competitor") {
                        const activity = wcifData.activityIdToGroup[assignment.activityId];
                        if (activity) {
                            const activityCode = activity.activityCode;
                            const actArray = activityCode.split("-");
                            const event = actArray[0];
                            const round = actArray[1].slice(1);
                            const group = actArray[2].slice(1);
                            const roundId = event + "-r" + round;
                            const cutoff = wcifData.roundIdToCutoff[roundId].cutoff;
                            const timeLimit = wcifData.roundIdToCutoff[roundId].timeLimit;
                            const format = wcifData.roundToFormat[roundId];
                            const attempts = formats[format].attempts;
                            if (event === '333fm') {
                                continue;
                            }
                            if (event === '333mbf') {
                                generator.addMBFScoresheet(playerName, playerId, round, attempts);
                            } else {
                                generator.addScoresheet(playerName, playerId, eventNames[event],
                                                round, attempts, group, cutoff, timeLimit);
                            }
                        }
                        }
                }
            }
        }
    }
    
    function generateByNameWithGroup(wcifData, generator) {
        generator.five = _.sortBy(generator.five, 'Name');
        generator.three = _.sortBy(generator.three, 'Name');
        generator.two = _.sortBy(generator.two, 'Name');
        generator.one = _.sortBy(generator.one, 'Name');
    }
    
    function generateByEventGroup(wcifData, generator) {
        generator.five = _.sortBy(generator.five, 'group');
        generator.five = _.sortBy(generator.five, 'Event');
        generator.three = _.sortBy(generator.three, 'group');
        generator.three = _.sortBy(generator.three, 'Event');
        generator.two = _.sortBy(generator.two, 'group');
        generator.two = _.sortBy(generator.two, 'Event');
        generator.one = _.sortBy(generator.one, 'group');
        generator.one = _.sortBy(generator.one, 'Event');
    }


    function generateEmptyScoresheet() {
        var eventName = $('#selectEvent').find("option:selected").val();
        if (eventName == 'Event') {
            eventName = '';
        }
        var round = $('#selectRound').find("option:selected").val();
        if (round == 'Round') {
            round = '';
        }
        var attemptsString = $('#selectAttempts').find("option:selected").val();
        var attempts;
        if (attemptsString == 'Number of Attempts') {
            attempts = eventDefaults[eventName].attempts;
        } else {
            var attempts = parseInt(attemptsString);
        }
        var number = parseInt($('#copies').val());
        if (!number) {
            number = eventDefaults[eventName].number;
        }
        var numGroups = parseInt($('#groups').val());
        if (!numGroups) {
            numGroups = 0;
        }
        var fillRank = $('#fillRank').is(':checked');
        var competitionName = $('#compName').val();
        if (!competitionName) {
            if (wcifData.name) {
                competitionName = wcifData.name;
            }
            competitionName = 'WCA Competition';
        }
        generateEmpty(eventName, round, attempts, number, competitionName, numGroups=numGroups, fillRank=fillRank);
    }

    function generateEmpty(eventName, round, attempts, number, competitionName, numGroups=0, fillRank=false) {
        var generator = new scoresheetGenerator(competitionName);
        var playerPerGroup = number;
        if (numGroups > 0) {
            playerPerGroup = Math.ceil(number / numGroups);
        }
        for (var i = 0; i < number; i++) {
            var groupId = "";
            var name = "";
            if (fillRank) {
                name = "(" + (i + 1) + ")";
            }
            if (numGroups > 0) {
                groupId = Math.floor(i / playerPerGroup) + 1;
            }
            if (eventName != '3×3 Multi-BF') {
                generator.addScoresheet(name, '', eventName, round, attempts, group=groupId);
            } else {
                generator.addMBFScoresheet(name, '', round, attempts);
            }
        }
        generator.generatePDF(competitionName + ' ' + eventName + ' Round ' + round);
    }


    function fillEmpty() {
        var eventText = '<option selected="selected">Event</option>';
        for (var i in eventNames) {
            if (i != '333fm') {
                eventText += '<option>' + eventNames[i] + '</option>';
            }
        }
        $('#selectEvent').html(eventText);


        var roundText = '<option>Round</option>';
        for (var i = 1; i <= 4; i++) {
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


