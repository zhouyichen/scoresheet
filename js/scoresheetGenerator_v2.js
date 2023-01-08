/**
 * The Generator object is to be passed into the generate pdf function.
 * It stores the scoresheet objects according to the number of attempts
 */
var scoresheetGenerator = function (compName="WCA Competition") {
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
    var fontSize;

    var images = [];
    var canva;
    var ctx;
    var scale = 11;

    this.five = [];
    this.three = [];
    this.two = [];
    this.one = [];
    this.mbf = [];

    /**
     * Add a new scoresheet in the queue for generating PDF
     * @param {string} player   
     * @param {integer} index  
     * @param {string} event  all events except 3x3 cube multiple-blindfolded
     * @param {integer} round
     * @param {integer} attempts number of attempts of the event
     * @param {integer} group 
     */
    this.addScoresheet = function (player, index, event, round, attempts, group = "") {
        var scoresheet = {
            Name: player,
            ID: index,
            Event: event,
            Round: 'Round ' + round,
            Group: 'Group ' + group,
            group: parseInt(group)
        };
        switch (attempts) {
            case 5:
                (this.five).push(scoresheet);
                break;
            case 3:
                (this.three).push(scoresheet);
                break;
            case 2:
                (this.two).push(scoresheet);
                break;
            case 1:
                (this.one).push(scoresheet);
                break;
        }
    }

    /**
     * Add a new multiple-blindfolded scoresheet in the queue for generating PDF
     * @param {string} player   
     * @param {integer} index  
     * @param {integer} round
     * @param {integer} attempts number of attempts of the event
     */
    this.addMBFScoresheet = function (player, index, round, attempts) {
        var scoresheet = {
            Name: player,
            ID: index,
            Event: "3×3 Multi-BF",
            Round: 'Round ' + round
        };
        scoresheet.attempts = attempts;
        (this.mbf).push(scoresheet);
    }

    /**
     * Generate the PDF for downloading
     * @param  {String} fileName the name of the file
     * @return {PDF}
     */
    this.generatePDF = function (fileName) {
        setUpCanvas();
        
        var doc = new jsPDF('p', 'pt');

        fontSize = 20;
        while (true){
            doc.setTextColor(0); doc.setFontStyle('bold'); doc.setFontSize(fontSize);
            var textDim = doc.getTextDimensions(this.compName);
            compnameWidth = textDim['w'];
            compnameHeight = textDim['h'];
            // console.log(compnameWidth, compnameHeight, fontSize)

            if (compnameWidth > A4PtSize.maxCompnameWidth){
                fontSize -= 1;
            }
            else {
                break;
            }
        }

        var firstPage = true;
        if (this.five.length > 0) {
            firstPage = false;
            generateByAttempts(this.five, doc, fiveAttemptsSettings, this.compName);
        }
        if (this.three.length > 0) {
            if (!firstPage) { doc.addPage(); }
            else { firstPage = false; }
            generateByAttempts(this.three, doc, threeAttemptsSettings, this.compName);
        }
        if (this.two.length > 0) {
            if (!firstPage) { doc.addPage(); }
            else { firstPage = false; }
            generateByAttempts(this.two, doc, twoAttemptsSettings, this.compName);
        }
        if (this.one.length > 0) {
            if (!firstPage) { doc.addPage(); }
            else { firstPage = false; }
            generateByAttempts(this.one, doc, oneAttemptSettings, this.compName);
        }
        if (this.mbf.length > 0) {
            if (!firstPage) { doc.addPage(); }
            else { firstPage = false; }
            switch ((this.mbf)[0].attempts) {
                case 3:
                    generateMBFByAttempts(this.mbf, doc, threeMBFAttemptsSettings);
                    break;
                case 2:
                    generateMBFByAttempts(this.mbf, doc, twoMBFAttemptsSettings);
                    break;
                case 1:
                    generateMBFByAttempts(this.mbf, doc, oneMBFAttemptSettings);
                    break;
            }
        }
        doc.save(fileName + '.pdf');
    }

    function setUpCanvas() {
        canva = document.createElement("CANVAS");
        var width = document.createAttribute("width");
        width.value = 1000;
        var height = document.createAttribute("height");
        height.value = 500;
        var style = document.createAttribute("style");
        style.value = "display:none";
        canva.setAttributeNode(width);
        canva.setAttributeNode(height);
        canva.setAttributeNode(style);

        ctx = canva.getContext("2d");
        ctx.font = "bold " + 35 * scale + "px Helvetica";
    }

    var AttemptsSettings = function (numberOfAttempts, sheetPerColumn) {
        this.number = numberOfAttempts;
        this.sheetPerColumn = sheetPerColumn;
        this.sheetPerPage = sheetPerColumn * 2;
        this.widthPerSheet = A4PtSize.width / 2;
        this.heightPerSheet = (A4PtSize.height - 2 * A4PtSize.topAndBottompadding) / sheetPerColumn;
        this.headerPlus = (this.heightPerSheet - (lineHeight * (numberOfAttempts + 2)) - 5) / 2;
        this.attempsPlus = this.headerPlus + lineHeight;
        this.tableXStart = 50;
        this.numberXStart = 6;
        this.vertPadding = 5 * (6 - numberOfAttempts);
        this.infoStart = 30;
        this.lineHeight = lineHeight;
    }

    var fiveAttemptsSettings = new AttemptsSettings(5, 2);
    var threeAttemptsSettings = new AttemptsSettings(3, 2);
    var twoAttemptsSettings = new AttemptsSettings(2, 3);
    var oneAttemptSettings = new AttemptsSettings(1, 4);


    var MBFAttemptsSettings = function (numberOfAttempts, sheetPerPage) {
        this.number = numberOfAttempts;
        this.sheetPerPage = sheetPerPage;
        this.spacePerSheet = (A4PtSize.height - 2 * A4PtSize.topAndBottompadding) / sheetPerPage;
        this.headerPlus = (this.spacePerSheet - (25 * (numberOfAttempts + 2)) - 5) / 2;
        this.attempsPlus = this.headerPlus + 25;
    }

    var threeMBFAttemptsSettings = new MBFAttemptsSettings(3, 5);
    var twoMBFAttemptsSettings = new MBFAttemptsSettings(2, 6);
    var oneMBFAttemptSettings = new MBFAttemptsSettings(1, 8);


    function generateByAttempts(generator, doc, settings, compName) {
        
        var data = [];
        for (var a = 1; a <= settings.number; a++) {
            data.push({ 'attempt': a });
        }
        data.push({ 'attempt': 'P' });
        var counter = 0;
        var yStart = A4PtSize.topAndBottompadding;
        var xStart = 0;
        doc.line(A4PtSize.mid_width, 0, A4PtSize.mid_width, A4PtSize.height);
        for (var i = 1; i < settings.sheetPerPage; i++) {
            var y = yStart + settings.heightPerSheet * i;
            doc.line(0, y, A4PtSize.width, y);
        }

        for (var sc in generator) {
            if (counter == settings.sheetPerPage) {
                counter = 0;
                doc.addPage();
                var yStart = A4PtSize.topAndBottompadding;
                var xStart = 0;
                doc.line(A4PtSize.mid_width, 0, A4PtSize.mid_width, A4PtSize.height);
                for (var i = 1; i < settings.sheetPerPage; i++) {
                    var y = yStart + settings.heightPerSheet * i;
                    doc.line(0, y, A4PtSize.width, y);
                }
            }
            var y = yStart + Math.floor(counter/2) * settings.heightPerSheet;
            var sheetXStart = (counter % 2) * settings.widthPerSheet;

            var scoresheet = generator[sc];

            // console.log(compnameWidth, compnameHeight);

            var xOffset = (A4PtSize.mid_width - compnameWidth*1.05) / 2 + sheetXStart;
            var yOffset = (settings.infoStart) + y - (settings.infoStart -compnameHeight)/2 ;
            doc.setTextColor(0); doc.setFontStyle('bold'); doc.setFontSize(fontSize);
            doc.text(compName, xOffset, yOffset);

            y += 2;

            doc.autoTable(headerRow1, [scoresheet], infoOptions(doc, sheetXStart+infoTableXOffset, y, headerSpacing));
            y += lineHeight;
            // // console.log(sheetXStart, y);
            doc.autoTable(headerRow2, [scoresheet], infoOptions(doc, sheetXStart+infoTableXOffset, y,  headerSpacing));
            y += lineHeight * 2 + settings.vertPadding * 2;

            // render attempts
            for (var a = 1; a <= settings.number; a++) {
                generateAttempt(a, doc, sheetXStart, y, settings, attemptsOptions, headerSpacing)
                y += lineHeight * 2 + settings.vertPadding;
            }
            generateAttempt("P", doc, sheetXStart, y, settings, attemptsOptions, headerSpacing, true)

            counter++;
        }
    }

    function generateAttempt(a, doc, x, y, settings, attemptsOptions, headerSpacing, provisional) {
        doc.setTextColor(0); doc.setFontStyle('bold'); doc.setFontSize(20);
        // console.log('' + a, x+settings.numberXStart, y+lineHeight)
        doc.text('' + a, x+settings.numberXStart, y+lineHeight*1.25);
        doc.autoTable(attempRow1, [{}], attemptsOptions(doc, x+attemptTableXOffset, y, headerSpacing));
        y += lineHeight;
        doc.autoTable(attempRow2, [{}], attemptsOptions(doc, x+attemptTableXOffset, y, headerSpacing, provisional));
    }

    // reusing old header options
    function headerOptions(doc, yStart, yPlus) {
        padding = 0;
        var leftAndRight = 10;
        var topAndBottom = 10;
        function containsSpecial(string){
            var allowed = 'abcdefghijklmnopqrstuvwxyz' +
                          'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                          "1234567890 ×-.'()";
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
            startY : yStart + yPlus - 30,
            overflow: false,
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

    function generateMBFByAttempts(generator, doc, settings) {
        var data = [];
        for (var a = 1; a <= settings.number; a++) {
            data.push({'attempt' : a});
        }
        var counter = 0;
        var yStart = -9;

        for (var scoresheet in generator) {
            if (counter == settings.sheetPerPage) {
                counter = 0;
                doc.addPage();
            }
            y = yStart + counter * settings.spacePerSheet;
            doc.line(0, y, A4PtSize.width, y);
            var sc = generator[scoresheet];
            sc.Event = '3×3 Multi-BF';
            doc.autoTable(header, [sc], headerOptions(doc, y, settings.headerPlus));
            doc.autoTable(MBFcolumns, data, (doc, y, settings.attempsPlus, MBFHeaderSpacing));
            counter++;
        }
        for (var i = counter; i < settings.sheetPerPage; i++) {
            var sc = [];
            sc.Event = '3×3 Multi-BF';
            sc.Round = 'Round';
            y = yStart + i * settings.spacePerSheet;
            doc.line(0, y, A4PtSize.width, y);
            doc.autoTable(header, [sc], headerOptions(doc, y, settings.headerPlus));
            doc.autoTable(MBFcolumns, data, MBFattemptsOptions(doc, y, settings.attempsPlus, MBFHeaderSpacing));
        }
    }

    var header = [
        { key: 'ID', width: 28 },
        { key: 'Name', width: 360 },
        { key: 'Event', width: 122 },
        { key: 'Round', width: 65 }
    ];


    var headerRow1 = [
        { title: 'Event', key: 'Event', width: 140 },
        { title: 'Round', key: 'Round', width: 70 },
        { title: 'Group', key: 'Group', width: 70 },
    ];
    var headerRow2 = [
        { title: 'ID', key: 'ID', width: 30 },
        { title: 'Name', key: 'Name', width: 250 },
    ];

    var attempRow1 = [
        { title: 'Scrambler', key: 'sc', width: 54 },
        { title: 'Displayed Time', key: 'time', width: 108 },
        { title: 'Final Result', key: 'result', width: 108 }
    ];
    var attempRow2 = [
        { title: 'Extra Scr.', key: 'extra', width: 54 },
        { title: 'Insp.', key: 'in', width: 27 },
        { title: 'Start', key: 'start', width: 27 },
        { title: 'Stop', key: 'stop', width: 27 },
        { title: 'State', key: 'ss', width: 27 },
        { title: 'Judge', key: 'js', width: 54 },
        { title: 'Player', key: 'ps', width: 54 }
    ];

    function infoOptions(doc, xStart, yStart, spacing) {
        padding = 2;
        var leftMargin = xStart;
        var rightMargin = A4PtSize.width - (leftMargin + 270);
        var topAndBottom = 10;
        function containsSpecial(string) {
            var allowed = 'abcdefghijklmnopqrstuvwxyz' +
                'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                "1234567890 ×-.'()";
            return _.some(string, function (char) {
                return !_.contains(allowed, char);
            });
        }
        // console.log("xStart, yStart", xStart, yStart)
        return {
            padding: padding,
            lineHeight: lineHeight,
            margins: {
                left: leftMargin,
                right: rightMargin,
            },
            startY: yStart,
            overflow: false,
            renderHeaderCell: function (x, y, width, height, key, value, settings) {
                // do nothing
            },
            renderCell: function (x, y, width, height, key, value, row, settings) {
                doc.setFontSize(10);
                doc.setFont("helvetica");
                doc.setFillColor(255);
                // console.log(x, y, width, height);
                doc.rect(x, y, width, height, 'S');
                doc.setFontStyle('bold');
                doc.setFontSize(14);
                x += 1;
                y += settings.lineHeight / 2 + doc.internal.getLineHeight() / 2 - 2.5;
                // console.log("value", value);
                if (key == 'Name' && containsSpecial(value)) {
                    var imgData;
                    if (localStorage.getItem(value)) {
                        imgData = localStorage.getItem(value);
                    }
                    else {
                        ctx.scale(1 / scale, 1 / scale);
                        ctx.fillText(value, 5 * scale, 40 * scale);
                        ctx.scale(scale, scale);
                        imgData = canva.toDataURL(value + '/png');
                        localStorage.setItem(value, imgData);
                    }
                    ctx.clearRect(0, 0, canva.width, canva.height);
                    doc.addImage(imgData, 'PNG', x + settings.padding - 1, y - 14, 4 * canva.width / scale, 4 * canva.height / scale);
                }
                else {
                    if (value) {
                        doc.setTextColor(0);
                        if (key == "Name") {
                            doc.setFontSize(12);
                        }
                        doc.text('' + value, x + settings.padding, y);
                        doc.setTextColor(0);
                    }
                    else {
                        doc.setTextColor(191);
                        doc.text('' + key, x + settings.padding, y);
                        doc.setTextColor(0);
                    }

                }
            }
        };
    }



    function attemptsOptions(doc, xStart, yStart, headerSpacing, provisional=false) {
        padding = 0;
        var leftMargin = xStart;
        var rightMargin = A4PtSize.width - (leftMargin + 265);
        var topAndBottom = 10;
        var provisional = provisional;
        return {
            padding: padding,
            margins: {
                left: leftMargin,
                right: rightMargin,
            },
            startY: yStart,
            lineHeight: lineHeight-5,
            extendWidth: false,
            renderHeaderCell: function (x, y, width, height, key, value, settings) {
                doc.setFontSize(9);
                doc.setLineWidth(0.5);
                if (key === "result") {
                    doc.setLineWidth(2);
                }
                doc.rect(x, y, width, height, 'S');
                x = headerSpacing(x, key, doc);
                doc.setFontStyle('bold');
                y += settings.lineHeight / 2 + doc.internal.getLineHeight() / 2 ;
                doc.setTextColor(223);
                var text = value;
                if (key === "extra" && provisional) {
                    text = "Attempt No.";
                    doc.setFontSize(9);
                    x -= 2;
                }
                doc.text('' + text, x + settings.padding, y);
                doc.setTextColor(0);
            },
            renderCell: function (x, y, width, height, key, value, row, settings) {
            }
        };
    }

    function headerSpacing(x, key, doc) {
        switch (key) {
            case 'start':
                x += 0;
            case 'stop':
                x += 0;
            case 'in':
                x += 1;
            case 'ss':
                x += 3;
                doc.setFontSize(8);
                break;
            case 'result':
                x += 7;
            case 'time':
                x += 14;
                doc.setFontSize(11);
                break;
            case 'sc':
                doc.setFontSize(10);
                x += 2;
                break;
            case 'js':
                doc.setFontSize(10);
                x += 12;
                break;
            case 'ps':
                doc.setFontSize(10);
                x += 12;
                break;
            case 'extra':
                doc.setFontSize(10);
                x += 3;
                break;
        }
        return x;
    }

    function MBFHeaderSpacing(x, key, doc) {
        switch (key) {
            case 'ca':
                x += 4;
                break;
            case 'start':
            case 'stop':
            case 'ss':
                x += 6;
                doc.setFontSize(8);
                break;
            case 'tl':
                x += 3;
            case 'pn':
                x += 5;
                doc.setFontSize(10);
                break;
            case 'result':
                x += 5;
            case 'time':
                x += 18;
                doc.setFontSize(11);
                break;
            case 'sc':
                doc.setFontSize(10);
                x += 3;
                break;
            case 'js':
                doc.setFontSize(10);
                x += 12;
                break;
            case 'ps':
                doc.setFontSize(10);
                x += 12;
                break;
        }
        return x;
    }

    function MBFattemptsOptions(doc, yStart, yPlus, headerSpacing) {
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
                doc.setFillColor(row % 2 === 0 ? 240 : 255);
                doc.rect(x, y, width, height, 'B');
                y += settings.lineHeight / 2 + doc.internal.getLineHeight() / 2 - 2.5;
                if (key == 'ca'){
                    doc.text('/', x + 38, y);
                } else {
                    doc.text('' + value, x + settings.padding, y);
                }
            }
        };
    }


    var MBFcolumns = [
        { title: ' ', key: 'attempt', width: 5 },
        { title: 'Scrambler', key: 'sc', width: 50 },
        { title: 'Displayed Time', key: 'time', width: 115 },
        { title: 'Time Limit', key: 'tl', width: 60 },
        { title: 'Penalties', key: 'pn', width: 50 },
        { title: 'Completed/Attempted', key: 'ca', width: 80 },
        { title: 'Final Result', key: 'result', width: 115 },
        { title: 'Judge', key: 'js', width: 50 },
        { title: 'Player', key: 'ps', width: 50 }
    ];
}
