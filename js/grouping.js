/**
 * The Generator object is to be passed into the generate pdf function.
 * It stores the scoresheet objects according to the number of attempts
 */

const STAFF_JUDGE = "staff-judge";
const STAFF_SCRAMBLER = "staff-scrambler";

var groupingPrinter = function (compName="WCA Competition") {
    var A4PtSize = {
        height: 842,
        width: 595,
        mid_width: 297,
        maxCompnameWidth: 260,
        topAndBottompadding: -1
    };
    
    this.compName = compName;

    var lineHeight = 25;
    var infoTableXOffset = 15;
    var attemptTableXOffset = 20;

    var compnameWidth;
    var compnameHeight;
    var nameFontSize = 10;
    var groupFontSize = nameFontSize + 2;
    var roleFontSize = nameFontSize + 1;

    var initX = 30;
    var numCols = 4;
    var colWidth = (A4PtSize.width - initX * 2) / numCols;
    var pageStartY = 50;
    var groupIndent = 70;
    var roleSpacing = nameFontSize + 15;

    var groupColumnsPerPage = 8;
    var tableRowsPerPage = 30;
    var totalRows = tableRowsPerPage + 2;
    var tablePlayerNameWidth = (A4PtSize.width - initX * 2) / numCols;
    var groupColWidth = (A4PtSize.width - initX * 2 - tablePlayerNameWidth) / groupColumnsPerPage;

    var images = [];
    var canva;
    var ctx;
    var scale = 11;


    this.formatName = function (name) {
        // if brackets in name, remove the brackets and its contents
        var bracketIndex = name.indexOf('(');
        let shortenName = name;
        if (bracketIndex != -1){
            shortenName = name.substring(0, bracketIndex-1);
        }
        return shortenName;
    }

    this.formatGroupTime = function (group) {
        var startTime = group.startTime;
        var endTime = group.endTime;
        // parse start and end time string to local time zone
        var start = new Date(startTime);
        var end = new Date(endTime);
        // print start and end time string in HH:MM format, in 24 hour time
        var startString = start.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: false });
        var endString = end.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: false });

        return "    Time: " + startString + " - " + endString;
    }

    this.setNextY = function (currentY, persons, doc) {
        var numPersons = persons.length;
        var numCols = 4;
        var numRows = Math.ceil(numPersons / numCols);
        var rowHeight = nameFontSize + 2;
        var tableHeight = numRows * rowHeight;
        var headerHeight = roleFontSize + 2;
        var currentGroupHeight = tableHeight + headerHeight;
        var nextY = currentY;
        if (currentY + currentGroupHeight > A4PtSize.height - 40) {
            doc.addPage();
            nextY = pageStartY;
        }
        return nextY;
    }

    this.generatePDF = function (acts, wcifData, fileName, tableFormat=false) {
        console.log(fileName);
        console.log(acts);

        var doc = new jsPDF('p', 'pt');
        doc.setTextColor(0); 
        doc.setFont('times', 'normal');

        if (tableFormat) {
            this.generateTableFormat(acts, wcifData, doc);
            doc.save(fileName + '.pdf');
            return
        }

        var actStartY = pageStartY;
        var currentY = actStartY;

        for (var roundIdx in acts) {
            const currentRound = acts[roundIdx];
            var nextRound = null;
            if (roundIdx < acts.length - 1) {
                nextRound = acts[roundIdx + 1];
            }
            for (var group of currentRound.childActivities) {
                const groupName = group.name;
                const groupTime = this.formatGroupTime(group);
                const actCode = group.activityCode;
                const competitors =  wcifData.actCodeToCompetitors[actCode];
                const judges = wcifData.actCodeToJudges[actCode];
                const scramblers = wcifData.actCodeToScramblers[actCode];
                console.log(groupName, groupTime);
                console.log({competitors, judges, scramblers});

                // print group name and group time
                doc.setFontStyle('bold'); doc.setFontSize(groupFontSize);
                currentY = this.setNextY(currentY + 5, scramblers.slice(0, 3), doc);
                doc.text(groupName + groupTime, initX+groupIndent, currentY);
                currentY += groupFontSize;

                currentY = this.setNextY(currentY, scramblers, doc);
                doc.setFontStyle('bold'); doc.setFontSize(roleFontSize);
                doc.text("Scramblers (" + scramblers.length + ")", initX, currentY);
                currentY += groupFontSize + 1;
                currentY = this.listPersons(currentY, scramblers, doc, prefix="[ ] ");
                currentY += roleSpacing;

                currentY = this.setNextY(currentY, judges, doc);
                doc.setFontStyle('bold'); doc.setFontSize(roleFontSize);
                doc.text("Judges (" + judges.length + ")", initX, currentY);
                currentY += groupFontSize + 1;
                currentY = this.listPersons(currentY, judges, doc, prefix="[ ] ");
                currentY += roleSpacing;

                if (competitors.length > 0) {
                    currentY = this.setNextY(currentY, competitors, doc);
                    doc.setFontStyle('bold'); doc.setFontSize(roleFontSize);
                    doc.text("Competitors (" + competitors.length + ")", initX, currentY);
                    currentY += groupFontSize + 1;
                    currentY = this.listPersons(currentY, competitors, doc);
                }

                currentY += 5; 
            }
        }
        doc.save(fileName + '.pdf');
    }   

    this.generateTableFormat = function (acts, wcifData, doc) {
        // get total number of groups, and all competitors with at least one role
        lineHeight = 22;
        var hPad = 2;
        var vPad = 5;

        var allVolunteers = {};
        var maxNameLength = 0;
        for (var person of wcifData.persons) {
            if (person.wcaUserId && person.shortName) {
                var isStaff = false;
                for (var role of person.roles) {
                    // if role contains 'staff',
                    if (role.includes('staff')) {
                        isStaff = true;
                        break;
                    }
                }
                if (isStaff) {
                    person.actIdToAss = {};
                    for (var ass of person.assignments) {
                        person.actIdToAss[ass.activityId] = ass.assignmentCode;
                    }
                    allVolunteers[person.wcaUserId] = person;
                }
            }
        }
        // sort volunteers by shortName
        var sortedVolunteers = Object.values(allVolunteers).sort(function (a, b) {
            return a.shortName.localeCompare(b.shortName);
        });
        var startY = pageStartY-10;
        var startX = initX;
        var nextX;
        var nextY;
        var groupCount = 0;
        for (var roundIdx in acts) {
            const currentRound = acts[roundIdx];
            var nextRound = null;
            if (roundIdx < acts.length - 1) {
                nextRound = acts[roundIdx + 1];
            }
            for (var group of currentRound.childActivities) {
                startY = pageStartY - 10;
                if (groupCount % groupColumnsPerPage == 0) {
                    if (groupCount > 0) {
                        doc.addPage();
                        startX = initX;
                    }
                    // render the name column
                    nextY = startY + 2 * lineHeight;
                    // doc.rect(startX, startY, nextX, startY + lineHeight, 'S');
                    doc.rect(startX, startY, tablePlayerNameWidth, lineHeight * 2, 'S');
                    doc.text('Name', startX + hPad, nextY - vPad);
                    for (var i = 0; i < totalRows; i++) {
                        var currentY = startY + (i+2) * lineHeight;
                        doc.rect(startX, currentY, tablePlayerNameWidth, lineHeight, 'S');
                        // get the ith volunteer
                        var volunteer = sortedVolunteers[i] || null;
                        if (volunteer) {
                            doc.setFontSize(nameFontSize);
                            doc.text(volunteer.shortName, startX + hPad, currentY + lineHeight - vPad);
                        }
                    }
                    startX = startX + tablePlayerNameWidth;
                }
                const actCode = group.activityCode;
                // split act code by the first "-r"
                var [eventId, groupId] = actCode.split(/-r(.+)/);
                var groupId = 'R' + groupId.replace('g', 'G');

                nextX = startX + groupColWidth;
                nextY = startY + 2 * lineHeight;
                doc.rect(startX, startY, groupColWidth, lineHeight*2, 'S');
                doc.text(eventId, startX + hPad, startY + lineHeight - vPad);
                doc.text(groupId, startX + hPad, startY + 2 * lineHeight - vPad);

                for (var i = 0; i < totalRows; i++) {
                    var currentY = startY + (i+2) * lineHeight;
                    var rectStyle = 'S';
                    
                    // get the ith volunteer
                    var volunteer = sortedVolunteers[i] || null;
                    if (volunteer) {
                        var assCode = volunteer.actIdToAss[group.id] || null;
                        if (assCode === STAFF_JUDGE) {
                            rectStyle = 'FD';
                            doc.setFillColor(255, 191, 95); // light red
                        }
                        else if (assCode === STAFF_SCRAMBLER) {
                            rectStyle = 'FD';
                            doc.setFillColor(191, 255, 95); // light green
                        } 
                    }
                    doc.rect(startX, currentY, groupColWidth, lineHeight, rectStyle);
                }
                startX = nextX;
                groupCount += 1;

            }
        }
        console.log("Total groups: " + groupCount);

    }


    this.listPersons = function (currentY, persons, doc, prefix="") {
        doc.setFontStyle('normal'); 
        var numPersons = persons.length;
        var currentX = initX;
        // sort persons by name length, from shortest to longest
        persons.sort(function (a, b) {
            return a.shortName.length - b.shortName.length;
        });

        for (var i = 0; i < numPersons; i++) {
            var person = persons[i];
            var personName = person.shortName;
            var fontSize = nameFontSize;
            
            doc.setFontSize(fontSize);
            var textDim = doc.getTextDimensions(personName);
            compnameWidth = textDim['w'];
            compnameHeight = textDim['h'];
            if (compnameWidth > colWidth){
                fontSize -= 1;
            }
            doc.setFontSize(fontSize);

            if (person.competeNext) {
                console.log(personName + " competes next", person);
                doc.setFontStyle('bold');
                const textDim = doc.getTextDimensions(personName);
                compnameWidth = textDim['w'];
                doc.line(currentX+11, currentY+2, currentX + compnameWidth + 12, currentY+2);
            }

            doc.text(prefix + personName, currentX, currentY);
            doc.setFontStyle('normal');
            if ((i + 1) % numCols == 0) {
                currentX = initX;
                currentY += nameFontSize + 2;
            } else {
                currentX += colWidth;
            }
        }
        if (numPersons % numCols != 0) {
            currentY += nameFontSize + 2;
        }

        return currentY;
    }

    this.checkStaffGrouping = function (wcifData) {
        for (const venueIdx in wcifData.schedule.venues) {
            var venue = wcifData.schedule.venues[venueIdx];
            console.log(venue);
            for (const roomIdx in venue.rooms) {
                var room = venue.rooms[roomIdx];
                var lastGroup = null;
                var lastActCode = null;
                var lastCompetitors = null;
                var lastJudges = null;
                var lastScramblers = null;
                var lastCompetitorIds = null;
                var lastJudgeIds = null;
                var lastScramblerIds = null;
                for (const act of room.allCompetingActs) {
                    for (var group of act.childActivities) {
                        const currentActCode = group.activityCode;
                        const currentCompetitors = wcifData.actCodeToCompetitors[currentActCode];
                        const currentJudges = wcifData.actCodeToJudges[currentActCode];
                        const currentScramblers = wcifData.actCodeToScramblers[currentActCode];
                        const currentCompetitorIds = currentCompetitors.map(p => p.wcaUserId);
                        const currentJudgeIds = currentJudges.map(p => p.wcaUserId);
                        const currentScramblerIds = currentScramblers.map(p => p.wcaUserId);
                        if (lastGroup) {
                            const lastEndTime = new Date(lastGroup.endTime);
                            const currentStartTime = new Date(group.startTime);
                            const diff = currentStartTime - lastEndTime;
                            if (diff < 300000) { // 5 minutes
                                for (const judge of currentJudges) {
                                    if (lastCompetitorIds.includes(judge.wcaUserId)) {
                                        judge.competePrev = true;
                                    }
                                }
                                for (const scrambler of currentScramblers) {
                                    if (lastCompetitorIds.includes(scrambler.wcaUserId)) {
                                        scrambler.competePrev = true;
                                    }
                                }
                                for (const judge of lastJudges) {
                                    if (currentCompetitorIds.includes(judge.wcaUserId)) {
                                        judge.competeNext = true;
                                    }
                                }
                                for (const scrambler of lastScramblers) {
                                    if (currentCompetitorIds.includes(scrambler.wcaUserId)) {
                                        scrambler.competeNext = true;
                                    }
                                }
                                for (const competitor of currentCompetitors) {
                                    if (lastJudgeIds.includes(competitor.wcaUserId)) {
                                        competitor.staffPrev = true;
                                    }
                                    if (lastScramblerIds.includes(competitor.wcaUserId)) {
                                        competitor.staffPrev = true;
                                    }
                                }
                                for (const competitor of lastCompetitors) {
                                    if (currentJudgeIds.includes(competitor.wcaUserId)) {
                                        competitor.staffNext = true;
                                    }
                                    if (currentScramblerIds.includes(competitor.wcaUserId)) {
                                        competitor.staffNext = true;
                                    }
                                }
                            }
                        }
                        lastGroup = group;
                        lastActCode = currentActCode
                        lastCompetitors = currentCompetitors;
                        lastScramblers = currentScramblers;
                        lastJudges = currentJudges;
                        lastCompetitorIds = currentCompetitorIds;
                        lastJudgeIds = currentJudgeIds;
                        lastScramblerIds = currentScramblerIds;
                    }
                }
            }
        }
    }

}
