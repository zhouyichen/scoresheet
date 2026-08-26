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

    $('#configNonFirstRounds').mouseup(function () {
        renderNonFirstRoundsConfig(wcifData);
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
        var string = 'data:text/csv;charset=utf-8, ID,Name,Country,WCA ID,Email';
        var event_to_idx = {};
        wcifData.events.forEach(function (event, index) {
            var eventID = event.id;
            string += ',' + eventID;
            event_to_idx[eventID] = index;
        })
        string += '\n';
        for (const person of wcifData.persons) {
            if (person.registration != null && person.registration.status == "accepted") {
                var person_str = person.registrantId + ',' + person.name + ',' + person.countryIso2 + ',' + person.wcaId + ',' + person.email;
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
                url: "https://www.worldcubeassociation.org/api/v0/competitions/" + compId + "/wcif/version/2",
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

    function getRoundInfo(roundId) {
        const actArray = roundId.split("-");
        return {
            event: actArray[0],
            round: actArray[1].slice(1)
        };
    }

    function getActivityInfo(activityCode) {
        const actArray = activityCode.split("-");
        return {
            event: actArray[0],
            round: actArray[1].slice(1),
            group: actArray.length > 2 && actArray[2].startsWith("g") ? actArray[2].slice(1) : ""
        };
    }

    function getFormatAttempts(format) {
        if (!formats[format]) {
            console.warn("Unknown WCIF round format: " + format);
            return 5;
        }
        return formats[format].attempts;
    }

    function needSpecialMarking(competitor, round, wcifData, alwaysCheckForFinal=false) {
        const roundInfo = round ? getRoundInfo(round.id) : {};
        const eventId = roundInfo.event;
        const personalBests = competitor && competitor.personalBests ? competitor.personalBests : [];

        if (['666', '777', 'minx'].includes(eventId)) {
            return false;
        }
        var rankType = 'average'
        var maxNR = 3;
        if (eventId.includes('bf')) {
            rankType = 'single';
        }
        if (eventId === '555') {
            maxNR = 1;
        }
        const eventPB = personalBests.find(personalBest =>
            personalBest.eventId === eventId && personalBest.type === rankType
        );

        if ((eventPB &&
                (eventPB.worldRanking <= 50 ||
                 (eventPB.continentalRanking <= 5 && eventPB.continentalRanking > 0)||
                 (eventPB.nationalRanking <= maxNR && eventPB.nationalRanking > 0)))
        ) {
            return true;
        }
        if (alwaysCheckForFinal && round) {
            const event = wcifData.events.find(event => event.id === eventId);
            if (event && event.rounds[event.rounds.length - 1].id === round.id) {
                return true;
            }
        }
        return false;
    }

    function isRegistrationSourceRound(round, idx) {
        const participationRuleset = round.participationRuleset;
        const participationSource = participationRuleset && participationRuleset.participationSource;
        return idx === 0 || (participationSource && participationSource.type === "registrations");
    }

    function getFirstRoundEquivalentIds(event) {
        const firstRoundIds = new Set();
        event.rounds.forEach((round, idx) => {
            if (isRegistrationSourceRound(round, idx)) {
                firstRoundIds.add(round.id);
                if (Array.isArray(round.linkedRounds)) {
                    round.linkedRounds.forEach(roundId => firstRoundIds.add(roundId));
                }
            }
        });
        return event.rounds
            .map(round => round.id)
            .filter(roundId => firstRoundIds.has(roundId));
    }

    function normalizeCutoffAndTimeLimit(round) {
        if (round.cutoff != null && round.cutoff.resultValue == null && round.cutoff.attemptResult != null) {
            round.cutoff.resultValue = round.cutoff.attemptResult;
        }
        if (round.cutoff == null && round.timeLimit != null) {
            if (round.timeLimit.centiseconds === 60000 &&
                round.timeLimit.cumulativeRoundIds.length === 0
            ) {
                round.timeLimit = null;
            }
        }
    }

    function getSourceRoundIds(round, fallbackRound) {
        const participationRuleset = round.participationRuleset;
        const participationSource = participationRuleset && participationRuleset.participationSource;
        if (participationSource) {
            if (participationSource.type === "round" && participationSource.roundId) {
                return [participationSource.roundId];
            }
            if (participationSource.type === "linkedRounds" && Array.isArray(participationSource.roundIds)) {
                return participationSource.roundIds;
            }
        }
        return fallbackRound ? [fallbackRound.id] : [];
    }

    function buildBestSourceRankings(roundIds, roundIdToRound) {
        const rankings = {};
        roundIds.forEach(roundId => {
            const sourceRound = roundIdToRound[roundId];
            if (!sourceRound || !Array.isArray(sourceRound.results)) {
                return;
            }
            sourceRound.results.forEach(result => {
                if (result.ranking == null) {
                    return;
                }
                if (rankings[result.personId] == null || result.ranking < rankings[result.personId]) {
                    rankings[result.personId] = result.ranking;
                }
            });
        });
        return rankings;
    }

    function addCompetitorScoresheet(generator, wcifData, playerName, playerId, roundId, group,
                                     preserveWcifTimeLimit=false) {
        const roundInfo = getRoundInfo(roundId);
        const cutoffMap = preserveWcifTimeLimit
            ? wcifData.roundIdToPreCompetitionCutoff
            : wcifData.roundIdToCutoff;
        const cutoffInfo = cutoffMap[roundId] || {};
        const format = wcifData.roundToFormat[roundId];
        const attempts = getFormatAttempts(format);
        if (roundInfo.event === '333fm') {
            return;
        }
        if (roundInfo.event === '333mbf') {
            generator.addMBFScoresheet(playerName, playerId, roundInfo.round, attempts, roundId);
        } else {
            const specialMarker = needSpecialMarking(
                wcifData.idToPerson[playerId],
                wcifData.roundIdToRound[roundId],
                wcifData
            );
            generator.addScoresheet(
                playerName,
                playerId,
                eventNames[roundInfo.event],
                roundInfo.round,
                attempts,
                group,
                cutoffInfo.cutoff,
                cutoffInfo.timeLimit,
                specialMarker,
                roundId
            );
        }
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
                round.results.forEach((res, idx) => {
                    const person = wcifData.idToPerson[res.personId];
                    let playerName = person.name;
                    const wcaId = person.wcaId;
                    if (wcaId == null) { // if wcaId is empty, add newcomer
                        playerName = "(new) " + playerName;
                    }
                    const group = Math.floor(idx / playersPerGroup) + 1;
                    addCompetitorScoresheet(generator, wcifData, playerName, res.personId, roundId, group);
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
                var roomHTML = '<div class="grouping-room">';
                roomHTML += "<h3>" + roomName + "</h3>";
                var firstRoundsId = "fr_" + venueIdx + "_" + roomIdx;
                var nonFirstRoundsId = "nfr_" + venueIdx + "_" + roomIdx;
                var allRoundsId = "ar_" + venueIdx + "_" + roomIdx;
                var allRoundsTableId = "art_" + venueIdx + "_" + roomIdx;
                var scramblersButtonId = "scr_" + venueIdx + "_" + roomIdx;
                var scramblersInputId = "scrpg_" + venueIdx + "_" + roomIdx;

                roomHTML += '<div class="btn-group" role="group">';
                roomHTML += '<button type="button" class="btn btn-default" id="' + firstRoundsId + '">First Rounds Only</button>';
                roomHTML += '<button type="button" class="btn btn-default" id="' + nonFirstRoundsId + '">Non-First Rounds Only</button>';
                roomHTML += '<button type="button" class="btn btn-default" id="' + allRoundsId + '">All Rounds</button>';
                roomHTML += '<button type="button" class="btn btn-default" id="' + allRoundsTableId + '">All Rounds Table</button>';
                roomHTML += '</div>';

                roomHTML += '<div class="form-inline grouping-scramblers-controls">';
                roomHTML += '<label for="' + scramblersInputId + '" style="margin-right:8px;">Scramblers per group</label>';
                roomHTML += '<input type="number" class="form-control input-sm" min="1" value="3" id="' + scramblersInputId + '" style="width:80px;margin-right:8px;">';
                roomHTML += '<button type="button" class="btn btn-default" id="' + scramblersButtonId + '">Scramblers Only</button>';
                roomHTML += '</div>';
                roomHTML += '</div>';
                
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
            } else if (type === 'scr') {
                console.log('scramblers only clicked');
                fileName = roomName + '_Scramblers';
                var inputSelector = '#scrpg_' + venueIdx + '_' + roomIdx;
                var userInput = parseInt($(inputSelector).val(), 10);
                if (!Number.isFinite(userInput) || userInput < 1) {
                    userInput = 3;
                }
                generator.generateScramblerPDF(room.allCompetingActs, wcifData, fileName, userInput);
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
        wcifData.roundIdToPreCompetitionCutoff = {};
        wcifData.roundIdToRound = {};
        wcifData.eventIdToFirstRoundIds = {};
        wcifData.nonFirstRoundConfigValues = {};
        wcifData.nonFirstBlankPagesCustomized = false;

        wcifData.name = wcifData.shortName;
        for (const event of wcifData.events) {
            if (event.id === "333fm") {
                continue;
            }
            const firstRoundEquivalentIds = getFirstRoundEquivalentIds(event);
            wcifData.eventIdToFirstRoundIds[event.id] = firstRoundEquivalentIds;
            var previousRound = null;
            event.rounds.forEach((round, idx) => {
                wcifData.roundIdToRound[round.id] = round;
                if (firstRoundEquivalentIds.includes(round.id)) {
                    wcifData.firstRounds.push(round.id);
                } else {
                    wcifData.nonFirstRounds.push(round);
                    wcifData.nonFirstRoundIds.push(round.id);
                }
                wcifData.roundToFormat[round.id] = round.format;
                // Keep the WCIF time limit for pre-printed later-round sheets. The
                // normal generation flow intentionally suppresses the default
                // ten-minute limit below.
                wcifData.roundIdToPreCompetitionCutoff[round.id] = {
                    'cutoff': round.cutoff,
                    'timeLimit': round.timeLimit
                };
                normalizeCutoffAndTimeLimit(round);
                wcifData.roundIdToCutoff[round.id] = {'cutoff': round.cutoff, 'timeLimit': round.timeLimit};
                if (previousRound != null) {
                    const sourceRoundIds = getSourceRoundIds(round, previousRound);
                    const sourceRankings = buildBestSourceRankings(sourceRoundIds, wcifData.roundIdToRound);
                    round.results.forEach((r, idx) => {
                        r['preRanking'] = sourceRankings[r.personId] || 0;
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

    function getExpectedRoundCompetitors(round, event, wcifData) {
        if (round.manuallyAdded) {
            return round.expectedCompetitors;
        }

        const participationRuleset = round.participationRuleset || {};
        const participationSource = participationRuleset.participationSource || {};
        const resultCondition = participationSource.resultCondition || {};

        if (participationSource.type === 'registrations') {
            return wcifData.persons.filter(person =>
                person.registration != null &&
                person.registration.status === 'accepted' &&
                person.registration.isCompeting &&
                person.registration.eventIds.includes(event.id)
            ).length;
        }

        if (resultCondition.type === 'ranking' && Number.isFinite(resultCondition.value)) {
            return resultCondition.value;
        }

        if (resultCondition.type === 'percent' && Number.isFinite(resultCondition.value)) {
            const registeredCompetitors = wcifData.persons.filter(person =>
                person.registration != null &&
                person.registration.status === 'accepted' &&
                person.registration.isCompeting &&
                person.registration.eventIds.includes(event.id)
            ).length;
            return Math.ceil(registeredCompetitors * resultCondition.value / 100);
        }

        if (Array.isArray(round.results) && round.results.length > 0) {
            return round.results.length;
        }

        return 0;
    }

    function splitCompetitorsEvenly(numberOfCompetitors, numberOfGroups) {
        const groupCount = Math.max(1, numberOfGroups || 1);
        const baseSize = Math.floor(numberOfCompetitors / groupCount);
        const remainder = numberOfCompetitors % groupCount;
        const groupSizes = [];
        for (var idx = 0; idx < groupCount; idx++) {
            groupSizes.push(baseSize + (idx < remainder ? 1 : 0));
        }
        return groupSizes;
    }

    function roundUpToFullScoresheetPage(numberOfScoresheets) {
        return Math.ceil(numberOfScoresheets / 4) * 4;
    }

    function parseGroupSizes(value) {
        const trimmedValue = (value || '').trim();
        if (!trimmedValue) {
            return null;
        }
        const tokens = trimmedValue.split(/[\s,]+/);
        if (tokens.some(token => !/^\d+$/.test(token))) {
            return null;
        }
        return tokens.map(token => parseInt(token, 10));
    }

    function setRoundConfigError(input, message) {
        const cell = input.closest('td');
        cell.toggleClass('has-error', Boolean(message));
        cell.find('.round-config-error').text(message || '');
    }

    function validateRoundConfigInput(input) {
        const groupSizes = parseGroupSizes(input.val());
        const expectedCompetitors = parseInt(input.attr('data-expected-competitors'), 10) || 0;
        const expectedGroups = parseInt(input.attr('data-group-count'), 10) || 1;
        const manuallyAdded = input.attr('data-manually-added') === 'true';
        var error = '';

        if (groupSizes == null) {
            error = 'Enter whole numbers separated by spaces.';
        } else if (!manuallyAdded && groupSizes.length !== expectedGroups) {
            error = 'Enter exactly ' + expectedGroups + ' group value' + (expectedGroups === 1 ? '.' : 's.');
        } else {
            const configuredTotal = groupSizes.reduce((sum, size) => sum + size, 0);
            if (configuredTotal < expectedCompetitors) {
                error = 'Total must be at least ' + expectedCompetitors + '.';
            }
        }

        if (manuallyAdded && groupSizes != null) {
            input.closest('td').find('.round-config-summary').text(
                expectedCompetitors + ' competitors, ' + groupSizes.length + ' group' +
                (groupSizes.length === 1 ? '' : 's')
            );
        }
        setRoundConfigError(input, error);
        return error ? null : groupSizes;
    }

    function updateBlankScoresheetCount() {
        const pages = parseInt($('#nonFirstBlankPages').val(), 10);
        const validPages = Number.isFinite(pages) && pages >= 0 ? pages : 0;
        $('#nonFirstBlankCopies').text(validPages * 4);
    }

    function escapeHTMLAttribute(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function captureNonFirstRoundConfig(wcifData) {
        $('.non-first-round-groups').each(function () {
            wcifData.nonFirstRoundConfigValues[$(this).attr('data-round-id')] = $(this).val();
        });
        if ($('#nonFirstBlankPages').length > 0) {
            wcifData.nonFirstBlankPages = $('#nonFirstBlankPages').val();
        }
    }

    function getConfiguredCompetitorCount(round, event, wcifData) {
        const savedValue = wcifData.nonFirstRoundConfigValues[round.id];
        const savedGroupSizes = parseGroupSizes(savedValue);
        if (savedGroupSizes != null) {
            return savedGroupSizes.reduce((sum, size) => sum + size, 0);
        }
        return getExpectedRoundCompetitors(round, event, wcifData);
    }

    function addManualRound(wcifData, eventId) {
        captureNonFirstRoundConfig(wcifData);
        const event = wcifData.events.find(candidate => candidate.id === eventId);
        if (!event || event.rounds.length >= 4) {
            return;
        }

        const previousRound = event.rounds.reduce((latest, round) =>
            parseInt(getRoundInfo(round.id).round, 10) > parseInt(getRoundInfo(latest.id).round, 10)
                ? round
                : latest
        );
        const previousRoundNumber = parseInt(getRoundInfo(previousRound.id).round, 10);
        if (previousRoundNumber >= 4) {
            return;
        }

        const roundNumber = previousRoundNumber + 1;
        const roundId = event.id + '-r' + roundNumber;
        const expectedCompetitors = Math.ceil(
            getConfiguredCompetitorCount(previousRound, event, wcifData) / 2
        );
        const round = {
            id: roundId,
            format: previousRound.format,
            timeLimit: previousRound.timeLimit,
            cutoff: previousRound.cutoff,
            scrambleSetCount: 1,
            results: [],
            linkedRounds: null,
            participationRuleset: null,
            manuallyAdded: true,
            expectedCompetitors: expectedCompetitors
        };

        event.rounds.push(round);
        wcifData.nonFirstRounds.push(round);
        wcifData.nonFirstRoundIds.push(roundId);
        wcifData.roundToFormat[roundId] = round.format;
        wcifData.roundIdToRound[roundId] = round;
        wcifData.roundIdToCutoff[roundId] = {
            cutoff: round.cutoff,
            timeLimit: round.timeLimit
        };
        const previousPreCompetitionCutoff =
            wcifData.roundIdToPreCompetitionCutoff[previousRound.id] || {};
        wcifData.roundIdToPreCompetitionCutoff[roundId] = {
            cutoff: previousPreCompetitionCutoff.cutoff,
            timeLimit: previousPreCompetitionCutoff.timeLimit
        };
        wcifData.nonFirstRoundConfigValues[roundId] = String(expectedCompetitors);
        renderNonFirstRoundsConfig(wcifData);
    }

    function removeManualRound(wcifData, roundId) {
        captureNonFirstRoundConfig(wcifData);
        const round = wcifData.roundIdToRound[roundId];
        if (!round || !round.manuallyAdded) {
            return;
        }
        const eventId = getRoundInfo(roundId).event;
        const event = wcifData.events.find(candidate => candidate.id === eventId);
        event.rounds = event.rounds.filter(candidate => candidate.id !== roundId);
        wcifData.nonFirstRounds = wcifData.nonFirstRounds.filter(candidate => candidate.id !== roundId);
        wcifData.nonFirstRoundIds = wcifData.nonFirstRoundIds.filter(id => id !== roundId);
        delete wcifData.roundToFormat[roundId];
        delete wcifData.roundIdToRound[roundId];
        delete wcifData.roundIdToCutoff[roundId];
        delete wcifData.roundIdToPreCompetitionCutoff[roundId];
        delete wcifData.nonFirstRoundConfigValues[roundId];
        renderNonFirstRoundsConfig(wcifData);
    }

    function renderNonFirstRoundsConfig(wcifData) {
        if (!wcifData) {
            return;
        }

        const configurableEvents = wcifData.events.filter(event => event.id !== '333fm');
        var maxRoundNumber = 2;
        configurableEvents.forEach(event => {
            event.rounds.forEach(round => {
                maxRoundNumber = Math.max(maxRoundNumber, parseInt(getRoundInfo(round.id).round, 10));
            });
        });

        var totalScoresheets = 0;
        var tableHTML = '<div class="table-responsive"><table class="table table-bordered table-condensed">';
        tableHTML += '<thead><tr><th>Event ID</th>';
        for (var roundNumber = 2; roundNumber <= maxRoundNumber; roundNumber++) {
            tableHTML += '<th>Round ' + roundNumber + ' grouping</th>';
        }
        tableHTML += '</tr></thead><tbody>';

        configurableEvents.forEach(event => {
            const roundsByNumber = {};
            event.rounds.forEach(round => {
                if (wcifData.nonFirstRoundIds.includes(round.id)) {
                    roundsByNumber[parseInt(getRoundInfo(round.id).round, 10)] = round;
                }
            });
            const latestRoundNumber = event.rounds.reduce((latest, round) =>
                Math.max(latest, parseInt(getRoundInfo(round.id).round, 10)), 0
            );
            tableHTML += '<tr><th scope="row"><div>' + event.id + '</div>';
            if (event.rounds.length < 4 && latestRoundNumber < 4) {
                tableHTML += '<button type="button" class="btn btn-default btn-xs add-non-first-round" ' +
                    'data-event-id="' + event.id + '" style="margin-top: 5px;">Add round</button>';
            }
            tableHTML += '</th>';
            for (var currentRound = 2; currentRound <= maxRoundNumber; currentRound++) {
                const round = roundsByNumber[currentRound];
                if (!round) {
                    tableHTML += '<td class="text-muted">&mdash;</td>';
                    continue;
                }
                const numberOfCompetitors = getExpectedRoundCompetitors(round, event, wcifData);
                const numberOfGroups = Math.max(1, parseInt(round.scrambleSetCount, 10) || 1);
                const defaultGroupSizes = splitCompetitorsEvenly(numberOfCompetitors, numberOfGroups);
                const savedValue = wcifData.nonFirstRoundConfigValues[round.id];
                const inputValue = savedValue == null ? defaultGroupSizes.join(' ') : savedValue;
                const savedGroupSizes = parseGroupSizes(inputValue);
                const displayedGroupCount = round.manuallyAdded && savedGroupSizes != null
                    ? savedGroupSizes.length
                    : numberOfGroups;
                const configuredTotal = savedGroupSizes == null
                    ? defaultGroupSizes.reduce((sum, size) => sum + size, 0)
                    : savedGroupSizes.reduce((sum, size) => sum + size, 0);
                totalScoresheets += configuredTotal;
                tableHTML += '<td>' +
                    '<input type="text" class="form-control non-first-round-groups" ' +
                    'data-round-id="' + round.id + '" ' +
                    'data-expected-competitors="' + numberOfCompetitors + '" ' +
                    'data-group-count="' + numberOfGroups + '" ' +
                    'data-manually-added="' + Boolean(round.manuallyAdded) + '" ' +
                    'value="' + escapeHTMLAttribute(inputValue) + '">' +
                    '<small class="text-muted round-config-summary">' +
                    numberOfCompetitors + ' competitors, ' + displayedGroupCount + ' group' +
                    (displayedGroupCount === 1 ? '' : 's') + '</small>' +
                    (round.manuallyAdded
                        ? '<div><button type="button" class="btn btn-link btn-xs remove-non-first-round" ' +
                          'data-round-id="' + round.id + '">Remove round</button></div>'
                        : '') +
                    '<span class="help-block round-config-error" style="margin: 2px 0 0;"></span>' +
                    '</td>';
            }
            tableHTML += '</tr>';
        });

        const defaultBlankPages = Math.ceil(totalScoresheets / 32);
        const blankPagesValue = wcifData.nonFirstBlankPagesCustomized
            ? wcifData.nonFirstBlankPages
            : defaultBlankPages;
        tableHTML += '<tr><th scope="row">Empty scoresheets</th><td colspan="' + Math.max(1, maxRoundNumber - 1) + '">' +
            '<div class="form-inline"><label for="nonFirstBlankPages">Pages&nbsp;</label>' +
            '<input type="number" min="0" step="1" class="form-control" id="nonFirstBlankPages" ' +
            'value="' + escapeHTMLAttribute(blankPagesValue) + '" style="width: 90px;">' +
            '<span style="margin-left: 10px;"><span id="nonFirstBlankCopies">' +
            ((parseInt(blankPagesValue, 10) || 0) * 4) +
            '</span> empty scoresheets (4 per page)</span></div>' +
            '<span class="help-block" id="nonFirstBlankPagesError" style="margin: 2px 0 0;"></span>' +
            '</td></tr>';
        tableHTML += '</tbody></table></div>';
        tableHTML += '<div class="alert alert-danger" id="nonFirstRoundsError" hidden></div>';
        tableHTML += '<button type="button" class="btn btn-primary" id="generateNonFirstRounds">' +
            'Generate non-1st Rounds Scoresheets</button>';

        console.log('number_of_all_scoresheets_in_all_rounds:', totalScoresheets);
        $('#nonFirstRoundsConfig').html(tableHTML).show();

        $('.non-first-round-groups').on('input', function () {
            wcifData.nonFirstRoundConfigValues[$(this).attr('data-round-id')] = $(this).val();
            validateRoundConfigInput($(this));
            $('#nonFirstRoundsError').hide();
        });
        $('#nonFirstBlankPages').on('input', function () {
            wcifData.nonFirstBlankPagesCustomized = true;
            wcifData.nonFirstBlankPages = $(this).val();
            updateBlankScoresheetCount();
            $('#nonFirstBlankPagesError').text('');
        });
        $('#generateNonFirstRounds').mouseup(function () {
            generateNonFirstRounds(wcifData);
        });
        $('.add-non-first-round').mouseup(function () {
            addManualRound(wcifData, $(this).attr('data-event-id'));
        });
        $('.remove-non-first-round').mouseup(function () {
            removeManualRound(wcifData, $(this).attr('data-round-id'));
        });
    }

    function generateNonFirstRounds(wcifData) {
        var isValid = true;
        var configuredRounds = [];
        $('.non-first-round-groups').each(function () {
            const input = $(this);
            const groupSizes = validateRoundConfigInput(input);
            if (groupSizes == null) {
                isValid = false;
            } else {
                configuredRounds.push({
                    roundId: input.attr('data-round-id'),
                    groupSizes: groupSizes
                });
            }
        });

        const blankPagesText = ($('#nonFirstBlankPages').val() || '').trim();
        const blankPages = parseInt(blankPagesText, 10);
        if (!/^\d+$/.test(blankPagesText) || !Number.isFinite(blankPages)) {
            $('#nonFirstBlankPagesError').text('Enter a non-negative whole number of pages.');
            $('#nonFirstBlankPages').closest('td').addClass('has-error');
            isValid = false;
        } else {
            $('#nonFirstBlankPagesError').text('');
            $('#nonFirstBlankPages').closest('td').removeClass('has-error');
        }

        if (!isValid) {
            $('#nonFirstRoundsError').text('Please fix the highlighted configuration values before generating.').show();
            const firstError = $('#nonFirstRoundsConfig .has-error input, #nonFirstBlankPagesError:not(:empty)').first();
            if (firstError.length > 0) {
                firstError.focus();
            }
            return;
        }

        var generator = new scoresheetGenerator(wcifData.name);
        var totalScoresheets = 0;
        configuredRounds.forEach(config => {
            const showGroupNumber = config.groupSizes.length > 1;
            config.groupSizes.forEach((groupSize, groupIdx) => {
                for (var copy = 0; copy < groupSize; copy++) {
                    addCompetitorScoresheet(
                        generator,
                        wcifData,
                        '',
                        '',
                        config.roundId,
                        showGroupNumber ? groupIdx + 1 : '',
                        true
                    );
                    totalScoresheets++;
                }
            });

            const configuredTotal = config.groupSizes.reduce((sum, size) => sum + size, 0);
            const paddedTotal = roundUpToFullScoresheetPage(configuredTotal);
            for (var paddingCopy = configuredTotal; paddingCopy < paddedTotal; paddingCopy++) {
                addCompetitorScoresheet(
                    generator, wcifData, '', '', config.roundId, '', true
                );
                totalScoresheets++;
            }
        });
        console.log('number_of_all_scoresheets_in_all_rounds:', totalScoresheets);

        const numberOfBlankScoresheets = blankPages * 4;
        for (var blankCopy = 0; blankCopy < numberOfBlankScoresheets; blankCopy++) {
            generator.addScoresheet('', '', '', '', 5, '');
        }

        console.log(generator);
        generator.generatePDF(wcifData.name + ' Non-1st Rounds', true);
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
                            const roundIds = wcifData.eventIdToFirstRoundIds[event] || [event + "-r1"];
                            roundIds.forEach(roundId => {
                                addCompetitorScoresheet(generator, wcifData, playerName, playerId, roundId, "");
                            });
                        }
                    }
                }
                for (const assignment of person.assignments) {
                    if (assignment.assignmentCode === "competitor") {
                        const activity = wcifData.activityIdToGroup[assignment.activityId];
                        if (activity) {
                            const activityInfo = getActivityInfo(activity.activityCode);
                            const roundId = activityInfo.event + "-r" + activityInfo.round;
                            addCompetitorScoresheet(generator, wcifData, playerName, playerId, roundId, activityInfo.group);
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
        generator.five = _.sortBy(generator.five, 'round');
        generator.five = _.sortBy(generator.five, 'Event');
        generator.three = _.sortBy(generator.three, 'group');
        generator.three = _.sortBy(generator.three, 'round');
        generator.three = _.sortBy(generator.three, 'Event');
        generator.two = _.sortBy(generator.two, 'group');
        generator.two = _.sortBy(generator.two, 'round');
        generator.two = _.sortBy(generator.two, 'Event');
        generator.one = _.sortBy(generator.one, 'group');
        generator.one = _.sortBy(generator.one, 'round');
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

        var copiesInput = ($('#copies').val() || '').trim();
        var groupCounts = null;
        if (copiesInput.includes(',')) {
            groupCounts = copiesInput
                .split(',')
                .map(s => parseInt(s.trim(), 10))
                .filter(n => Number.isFinite(n) && n > 0);
            if (groupCounts.length === 0) {
                groupCounts = null;
            }
        }

        var number = parseInt(copiesInput, 10);
        if (!number || groupCounts) {
            number = eventDefaults[eventName].number;
        }

        var numGroups = parseInt($('#groups').val(), 10);
        if (!numGroups || groupCounts) {
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

        if (groupCounts) {
            var generator = new scoresheetGenerator(competitionName);
            var currentRank = 1;
            groupCounts.forEach(function (count, idx) {
                var groupId = idx + 1;
                for (var i = 0; i < count; i++) {
                    var name = "";
                    if (fillRank) {
                        name = "(" + (currentRank++) + ")";
                    }
                    if (eventName != '3×3 Multi-BF') {
                        generator.addScoresheet(name, '', eventName, round, attempts, group=groupId);
                    } else {
                        generator.addMBFScoresheet(name, '', round, attempts);
                    }
                }
            });
            generator.generatePDF(competitionName + ' ' + eventName + ' Round ' + round);
            return;
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


