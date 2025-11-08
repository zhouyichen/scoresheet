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
    var roleSpacing = nameFontSize + 4;

    var groupColumnsPerPage = 8;
    var tableRowsPerPage = 31;
    var totalRows = tableRowsPerPage + 2;
    var tablePlayerNameWidth = (A4PtSize.width - initX * 2) / numCols;
    var groupColWidth = (A4PtSize.width - initX * 2 - tablePlayerNameWidth) / groupColumnsPerPage;

    var images = [];
    var canva;
    var ctx;
    var scale = 11;

    var pad2 = function (num) {
        return (num < 10 ? '0' : '') + num;
    };

    var getDateKey = function (timestamp) {
        if (!timestamp) {
            return '';
        }
        // The timestamp from WCIF is a UTC string (e.g., "2025-11-16T02:35:00Z").
        // new Date() parses this into a Date object.
        var date = new Date(timestamp);
        // Calling getFullYear(), getMonth(), getDate() on the Date object returns
        // the date components in the browser's local time zone.
        if (isNaN(date.getTime())) {
            return '';
        }
        return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    };


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
            return;
        }

        var sortedActs = Array.isArray(acts) ? acts.slice() : [];
        sortedActs.sort(function (a, b) {
            var aTime = Date.parse(a && a.startTime);
            var bTime = Date.parse(b && b.startTime);
            if (!Number.isFinite(aTime)) { aTime = 0; }
            if (!Number.isFinite(bTime)) { bTime = 0; }
            return aTime - bTime;
        });

        var currentY = pageStartY;
        var previousDateKey = null;

        for (var idx = 0; idx < sortedActs.length; idx++) {
            var currentRound = sortedActs[idx];
            if (!currentRound) {
                continue;
            }
            var roundDateKey = getDateKey(currentRound.startTime);
            if (previousDateKey !== null && roundDateKey !== previousDateKey) {
                doc.addPage();
                currentY = pageStartY;
            }
            previousDateKey = roundDateKey;

            var roundGroups = (Array.isArray(currentRound.childActivities) && currentRound.childActivities.length > 0)
                ? currentRound.childActivities
                : [currentRound];

            for (var groupIdx = 0; groupIdx < roundGroups.length; groupIdx++) {
                var group = roundGroups[groupIdx];
                if (!group) {
                    continue;
                }
                var groupName = group.name || currentRound.name || '';
                var groupTime = this.formatGroupTime(group);
                var actCode = group.activityCode;
                var competitors = (wcifData.actCodeToCompetitors && wcifData.actCodeToCompetitors[actCode]) || [];
                var judges = (wcifData.actCodeToJudges && wcifData.actCodeToJudges[actCode]) || [];
                var scramblers = (wcifData.actCodeToScramblers && wcifData.actCodeToScramblers[actCode]) || [];

                doc.setFontStyle('bold');
                doc.setFontSize(groupFontSize);
                currentY = this.setNextY(currentY + 5, scramblers.slice(0, 3), doc);
                doc.text((groupName || actCode) + groupTime, initX + groupIndent, currentY);
                currentY += groupFontSize;

                currentY = this.setNextY(currentY, scramblers, doc);
                doc.setFontStyle('bold');
                doc.setFontSize(roleFontSize);
                doc.text("Scramblers (" + scramblers.length + ")", initX, currentY);
                currentY += groupFontSize + 1;
                currentY = this.listPersons(currentY, scramblers, doc, "[ ] ");
                currentY += roleSpacing;

                currentY = this.setNextY(currentY, judges, doc);
                doc.setFontStyle('bold');
                doc.setFontSize(roleFontSize);
                doc.text("Judges (" + judges.length + ")", initX, currentY);
                currentY += groupFontSize + 1;
                currentY = this.listPersons(currentY, judges, doc, "[ ] ");
                currentY += roleSpacing;

                if (competitors.length > 0) {
                    currentY = this.setNextY(currentY, competitors, doc);
                    doc.setFontStyle('bold');
                    doc.setFontSize(roleFontSize);
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
        for (var person of wcifData.persons) {
            if (person.wcaUserId && person.shortName) {
                var isStaff = false;
                for (var role of person.roles) {
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
        var sortedVolunteers = Object.values(allVolunteers).sort(function (a, b) {
            return a.shortName.localeCompare(b.shortName);
        });

        var sortedActs = Array.isArray(acts) ? acts.slice() : [];
        sortedActs.sort(function (a, b) {
            var aTime = Date.parse(a && a.startTime);
            var bTime = Date.parse(b && b.startTime);
            if (!Number.isFinite(aTime)) { aTime = 0; }
            if (!Number.isFinite(bTime)) { bTime = 0; }
            return aTime - bTime;
        });

        var volunteer_start_idx = 0;
        var totalGroups = 0;

        while (volunteer_start_idx < sortedVolunteers.length) {
            var pageColumnIndex = 0;
            var previousDateKey = null;
            var columnBaseX = initX + tablePlayerNameWidth;

            var renderNameColumn = function () {
                var nameStartX = initX;
                var nameStartY = pageStartY - 10;
                var headerBottomY = nameStartY + 2 * lineHeight;
                doc.setFontStyle('normal');
                doc.rect(nameStartX, nameStartY, tablePlayerNameWidth, lineHeight * 2, 'S');
                doc.setFontSize(nameFontSize);
                doc.text('Name', nameStartX + hPad, headerBottomY - vPad);
                for (var i = 0; i < totalRows; i++) {
                    var rowY = nameStartY + (i + 2) * lineHeight;
                    doc.rect(nameStartX, rowY, tablePlayerNameWidth, lineHeight, 'S');
                    var volunteer = sortedVolunteers[i + volunteer_start_idx] || null;
                    if (volunteer) {
                        doc.text(volunteer.shortName, nameStartX + hPad, rowY + lineHeight - vPad);
                    }
                }
                pageColumnIndex = 0;
            };

            renderNameColumn();

            for (var roundIdx = 0; roundIdx < sortedActs.length; roundIdx++) {
                var currentRound = sortedActs[roundIdx];
                if (!currentRound) {
                    continue;
                }
                var currentDateKey = getDateKey(currentRound.startTime);
                if (totalGroups > 0 && previousDateKey !== null && currentDateKey !== previousDateKey) {
                    doc.addPage();
                    renderNameColumn();
                }
                previousDateKey = currentDateKey;

                var roundGroups = (Array.isArray(currentRound.childActivities) && currentRound.childActivities.length > 0)
                    ? currentRound.childActivities
                    : [currentRound];

                for (var groupIdx = 0; groupIdx < roundGroups.length; groupIdx++) {
                    var group = roundGroups[groupIdx];
                    if (!group) {
                        continue;
                    }

                    if (pageColumnIndex === groupColumnsPerPage) {
                        doc.addPage();
                        renderNameColumn();
                    }

                    var columnX = columnBaseX + (pageColumnIndex * groupColWidth);
                    var columnY = pageStartY - 10;

                    doc.rect(columnX, columnY, groupColWidth, lineHeight * 2, 'S');

                    var actCode = group.activityCode || '';
                    var eventId = actCode;
                    var groupIdText = '';
                    if (typeof actCode === 'string') {
                        var split = actCode.split(/-r(.+)/);
                        if (split.length > 1) {
                            eventId = split[0];
                            groupIdText = split[1] ? 'R' + split[1].replace('g', 'G') : '';
                        }
                    }

                    doc.setFontSize(nameFontSize);
                    doc.text(eventId, columnX + hPad, columnY + lineHeight - vPad);
                    if (groupIdText) {
                        doc.text(groupIdText, columnX + hPad, columnY + 2 * lineHeight - vPad);
                    }

                    for (var rowIdx = 0; rowIdx < totalRows; rowIdx++) {
                        var cellY = columnY + (rowIdx + 2) * lineHeight;
                        var rectStyle = 'S';
                        var volunteer = sortedVolunteers[rowIdx + volunteer_start_idx] || null;
                        if (volunteer) {
                            var assCode = volunteer.actIdToAss[group.id] || null;
                            if (assCode === STAFF_JUDGE) {
                                rectStyle = 'FD';
                                doc.setFillColor(255, 191, 95);
                            } else if (assCode === STAFF_SCRAMBLER) {
                                rectStyle = 'FD';
                                doc.setFillColor(191, 255, 95);
                            }
                        }
                        doc.rect(columnX, cellY, groupColWidth, lineHeight, rectStyle);
                    }

                    pageColumnIndex += 1;
                    totalGroups += 1;
                }
            }

            volunteer_start_idx += totalRows;
            if (volunteer_start_idx < sortedVolunteers.length) {
                doc.addPage();
            }
        }
        console.log("Total groups: " + totalGroups);

    }


    // Render a scrambler-only table with configurable number of columns per group
    this.generateScramblerPDF = function (acts, wcifData, fileName, scramblersPerGroup=3, options={}) {
        var doc = new jsPDF('p', 'pt');
        doc.setTextColor(0);
        doc.setFont('times', 'normal');

        if (!Array.isArray(acts)) {
            acts = [];
        }

        var groupColumnWidth = options.groupColumnWidth || 75;
        var leftMargin = initX;
        var topMargin = pageStartY;
        var bottomMargin = 40;
        var tableWidth = A4PtSize.width - leftMargin * 2;
        var maxGroupsPerPage = 17;
        var minGroupsPerPage = 15;
        var scrNameFontSize = nameFontSize;

        if (!Number.isFinite(scramblersPerGroup) || scramblersPerGroup < 1) {
            scramblersPerGroup = 3;
        } else {
            scramblersPerGroup = Math.floor(scramblersPerGroup);
        }

        scrNameFontSize = scrNameFontSize / (scramblersPerGroup + 1) * 4;

        if (groupColumnWidth >= tableWidth) {
            groupColumnWidth = tableWidth * 0.25;
        }

        var availableForScramblers = tableWidth - groupColumnWidth;
        var maxScramblers = Math.max(1, Math.floor(availableForScramblers / 60) - 1);
        if (scramblersPerGroup > maxScramblers) {
            scramblersPerGroup = maxScramblers;
        }

        var totalColumns = scramblersPerGroup + 2; // group column + scrambler columns + trailing empty column
        var remainingWidth = tableWidth - groupColumnWidth;
        var otherColumnWidth = remainingWidth / (totalColumns - 1);

        var scramblerLookup = wcifData && wcifData.actCodeToScramblers ? wcifData.actCodeToScramblers : {};

        var columnPositions = [];
        var currentX = leftMargin;
        columnPositions.push({x: currentX, width: groupColumnWidth});
        currentX += groupColumnWidth;
        for (var colIdx = 1; colIdx < totalColumns; colIdx++) {
            columnPositions.push({x: currentX, width: otherColumnWidth});
            currentX += otherColumnWidth;
        }

        var collectedGroups = [];
        for (var actIdx = 0; actIdx < acts.length; actIdx++) {
            var act = acts[actIdx];
            if (!act) {
                continue;
            }
            var actName = act.name || '';
            var actDateKey = getDateKey(act.startTime);
            var children = act.childActivities || [];
            if (children.length === 0) {
                var activityCode = act.activityCode;
                var scrList = scramblerLookup[activityCode] || [];
                var sortedScramblers = scrList.slice().sort(function (a, b) {
                    // return a.shortName.localeCompare(b.shortName);
                    return a.shortName.length - b.shortName.length;
                });
                var actLabel = activityCode.replace('-', ' ').toUpperCase();
                var actStart = act.startTime ? Date.parse(act.startTime) : 0;
                if (!Number.isFinite(actStart)) {
                    actStart = 0;
                }
                collectedGroups.push({
                    label: actLabel,
                    scramblers: sortedScramblers,
                    start: actStart,
                    dateKey: actDateKey
                });
            } else {
                for (var childIdx = 0; childIdx < children.length; childIdx++) {
                    var group = children[childIdx];
                    if (!group) {
                        continue;
                    }
                    var groupCode = group.activityCode;
                    var groupScr = scramblerLookup[groupCode] || [];
                    var sortedGroupScramblers = groupScr.slice().sort(function (a, b) {
                        // return a.shortName.localeCompare(b.shortName);
                        return a.shortName.length - b.shortName.length;
                    });
                    var eventCode = groupCode.split('-')[0];
                    var groupCode = groupCode.split('-')[1] + ' ' + groupCode.split('-')[2];
                    var displayLabel = eventCode + ' ' + groupCode.toUpperCase();
                    if (!displayLabel) {
                        displayLabel = groupCode;
                    }
                    var groupStart = group.startTime ? Date.parse(group.startTime) : 0;
                    if (!Number.isFinite(groupStart)) {
                        groupStart = 0;
                    }
                    collectedGroups.push({
                        label: displayLabel,
                        scramblers: sortedGroupScramblers,
                        start: groupStart,
                        dateKey: actDateKey
                    });
                }
            }
        }

        collectedGroups.sort(function (a, b) {
            if (a.dateKey === b.dateKey) {
                if (a.start === b.start) {
                    return a.label.localeCompare(b.label);
                }
                return a.start - b.start;
            }
            return a.dateKey.localeCompare(b.dateKey);
        });

        var availableHeight = A4PtSize.height - topMargin - bottomMargin;

        if (collectedGroups.length === 0) {
            var fallbackRows = minGroupsPerPage * 2;
            var fallbackRowHeight = availableHeight / fallbackRows;
            for (var fallbackRow = 0; fallbackRow < minGroupsPerPage; fallbackRow++) {
                var fallbackContentY = topMargin + fallbackRow * 2 * fallbackRowHeight;
                var fallbackSpacerY = fallbackContentY + fallbackRowHeight;
                for (var fallbackColumnIdx = 0; fallbackColumnIdx < totalColumns; fallbackColumnIdx++) {
                    var fallbackPosition = columnPositions[fallbackColumnIdx];
                    doc.rect(fallbackPosition.x, fallbackContentY, fallbackPosition.width, fallbackRowHeight, 'S');
                    doc.rect(fallbackPosition.x, fallbackSpacerY, fallbackPosition.width, fallbackRowHeight, 'S');
                }
            }
            doc.save(fileName + '.pdf');
            return;
        }

        // Calculate consistent slot count for all pages
        var totalGroupCount = collectedGroups.length;
        var slotsPerPage = minGroupsPerPage;
        for (var testSlots = minGroupsPerPage; testSlots <= maxGroupsPerPage; testSlots++) {
            var pagesNeeded = Math.ceil(totalGroupCount / testSlots);
            var totalSlotsNeeded = pagesNeeded * testSlots;
            var wastedSlots = totalSlotsNeeded - totalGroupCount;
            if (wastedSlots < testSlots / 2) {
                slotsPerPage = testSlots;
                break;
            }
        }

        var groupIndex = 0;
        while (groupIndex < collectedGroups.length) {
            // Fix: enforce date boundary per page. Collect groups for one date, limited by slotsPerPage.
            var currentDateKey = collectedGroups[groupIndex].dateKey;
            var pageGroups = [];
            while (
                groupIndex < collectedGroups.length &&
                pageGroups.length < slotsPerPage &&
                collectedGroups[groupIndex].dateKey === currentDateKey
            ) {
                pageGroups.push(collectedGroups[groupIndex]);
                groupIndex += 1;
            }

            var rowsThisPage = slotsPerPage * 2;
            var rowHeight = availableHeight / rowsThisPage;
            var rowPadding = Math.min(6, rowHeight / 4);
            var startY = topMargin;

            for (var pageRow = 0; pageRow < slotsPerPage; pageRow++) {
                var actualGroup = pageRow < pageGroups.length ? pageGroups[pageRow] : null;
                var contentRowY = startY + pageRow * 2 * rowHeight;
                var spacerRowY = contentRowY + rowHeight;

                for (var columnIdx = 0; columnIdx < totalColumns; columnIdx++) {
                    var position = columnPositions[columnIdx];
                    doc.rect(position.x, contentRowY, position.width, rowHeight, 'S');
                    doc.rect(position.x, spacerRowY, position.width, rowHeight, 'S');
                }

                if (actualGroup) {
                    doc.setFontStyle('bold');
                    doc.setFontSize(nameFontSize + 1);
                    var labelY = contentRowY + rowHeight - rowPadding;
                    doc.text(actualGroup.label, columnPositions[0].x + 4, labelY);
                    doc.setFontStyle('normal');
                    doc.setFontSize(scrNameFontSize);
                    for (var scrIdx = 0; scrIdx < scramblersPerGroup; scrIdx++) {
                        var scrambler = actualGroup.scramblers[scrIdx] || null;
                        if (scrambler) {
                            var textX = columnPositions[scrIdx + 1].x + 4;
                            var textY = contentRowY + rowHeight - rowPadding;
                            doc.text(scrambler.shortName, textX, textY);
                        }
                    }
                }
            }

            // New page if more groups remain (next may be same date needing another page, or next date)
            if (groupIndex < collectedGroups.length) {
                doc.addPage();
            }
        }

        doc.save(fileName + '.pdf');
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
