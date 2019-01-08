/**
 * The Generator object is to be passed into the generate pdf function.
 * It stores the scoresheet objects according to the number of attempts
 */
var scoresheetGenerator = function () {
    var A4PtSize = {
        height : 842,
        width : 595,
        topAndBottompadding: -9
    };

    var images = [];
    var canva;
    var ctx;
    var scale = 10;

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
     */
    this.addScoresheet = function (player, index, event, round, attempts) {
        var scoresheet = {
            Name    : player,
            ID      : index,
            Event   : event,
            Round   : 'Round ' + round
        };
        switch(attempts) {
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
            Name    : player,
            ID      : index,
            Event   : "3×3 Multi-BF",
            Round   : 'Round ' + round
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

        var firstPage = true;
        if (this.five.length > 0){
            firstPage = false;
            generateByAttempts(this.five, doc, fiveAttemptsSettings);
        }
        if (this.three.length > 0){
            if (!firstPage) { doc.addPage();}
            else {firstPage = false;}
            generateByAttempts(this.three, doc, threeAttemptsSettings);
        }
        if (this.two.length > 0){
            if (!firstPage) { doc.addPage();}
            else {firstPage = false;}
            generateByAttempts(this.two, doc, twoAttemptsSettings);
        }
        if (this.one.length > 0){
            if (!firstPage) { doc.addPage();}
            else {firstPage = false;}
            generateByAttempts(this.one, doc, oneAttemptSettings);
        }
        if (this.mbf.length > 0){
            if (!firstPage) { doc.addPage();}
            else {firstPage = false;}
            switch ((this.mbf)[0].attempts) {
                case 3:
                    generateMBFByAttempts(this.mbf, doc, threeAttemptsSettings);
                    break;
                case 2:
                    generateMBFByAttempts(this.mbf, doc, twoAttemptsSettings);
                    break;
                case 1:
                    generateMBFByAttempts(this.mbf, doc, oneAttemptSettings);
                    break;
            }  
        }
        doc.save(fileName+'.pdf');
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
        ctx.font = "bold " + 35 * scale +"px Helvetica";
    }

    var AttemptsSettings = function (numberOfAttempts, sheetPerPage) {
        this.number = numberOfAttempts;
        this.sheetPerPage = sheetPerPage;
        this.spacePerSheet = (A4PtSize.height - 2 * A4PtSize.topAndBottompadding) / sheetPerPage;
        this.headerPlus = (this.spacePerSheet - (25 * (numberOfAttempts + 2)) - 5) / 2;
        this.attempsPlus = this.headerPlus + 25;
    }

    var fiveAttemptsSettings = new AttemptsSettings(5, 4);
    var threeAttemptsSettings = new AttemptsSettings(3, 5);
    var twoAttemptsSettings = new AttemptsSettings(2, 6);
    var oneAttemptSettings = new AttemptsSettings(1, 8);

    function generateByAttempts(generator, doc, settings) {
        var data = [];
        for (var a = 1; a <= settings.number; a++) {
            data.push({'attempt' : a});
        }
        var counter = 0;
        var yStart = A4PtSize.topAndBottompadding;
        for (var sc in generator) {
            if (counter == settings.sheetPerPage) {
                counter = 0;
                doc.addPage();
            }
            y = yStart + counter * settings.spacePerSheet;
            doc.line(0, y, A4PtSize.width, y);
            var scoresheet = generator[sc];
            doc.autoTable(header, [scoresheet], headerOptions(doc, y, settings.headerPlus));
            doc.autoTable(columns, data, attemptsOptions(doc, y, settings.attempsPlus, headerSpacing));
            counter++;
        }
        for (var i = counter; i < settings.sheetPerPage; i++) {
            var sc = [];
            sc.Round = 'Round';
            y = yStart + i * settings.spacePerSheet;
            doc.line(0, y, A4PtSize.width, y);
            doc.autoTable(header, [sc], headerOptions(doc, y, settings.headerPlus));
            doc.autoTable(columns, data, attemptsOptions(doc, y, settings.attempsPlus, headerSpacing));
        }
    }

    function generateMBFByAttempts(generator, doc, settings) {
        var data = [];
        for (var a = 1; a <= settings.number; a++) {
            data.push({'attempt' : a});
        }
        var counter = 0;
        var yStart = A4PtSize.topAndBottompadding;

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
            doc.autoTable(MBFcolumns, data, attemptsOptions(doc, y, settings.attempsPlus, MBFHeaderSpacing));
            counter++;
        }
        for (var i = counter; i < settings.sheetPerPage; i++) {
            var sc = [];
            sc.Event = '3×3 Multi-BF';
            sc.Round = 'Round';
            y = yStart + i * settings.spacePerSheet;
            doc.line(0, y, A4PtSize.width, y);
            doc.autoTable(header, [sc], headerOptions(doc, y, settings.headerPlus));
            doc.autoTable(MBFcolumns, data, attemptsOptions(doc, y, settings.attempsPlus, MBFHeaderSpacing));
        }
    }

    var header = [
        {key: 'ID', width : 28},
        {key: 'Name', width : 360},
        {key: 'Event', width : 122},
        {key: 'Round', width : 65}
    ];

    var columns = [
        {title: ' ', key: 'attempt', width : 5},
        {title: 'Displayed Time', key: 'time', width : 130}, 
        {title: 'Inspection', key: 'in', width : 45},
        {title: 'Starting', key: 'start', width : 45}, 
        {title: 'Stopping', key: 'stop', width : 45},
        {title: 'Solved State', key: 'ss', width : 55},
        {title: 'Final Result', key: 'result', width : 130}, 
        {title: 'Judge Initial', key: 'js', width : 60}, 
        {title: 'Player Sign', key: 'ps', width : 60}
    ];

    var MBFcolumns = [
        {title: ' ', key: 'attempt', width : 5},
        {title: 'Displayed Time', key: 'time', width : 124},
        // {title: 'Starting', key: 'start', width : 34}, 
        // {title: 'Stopping', key: 'stop', width : 38},
        // {title: 'Solved State', key: 'ss', width : 53},
        {title: 'Time Limit', key: 'tl', width : 78}, 
        {title: 'Penalties', key: 'pn', width : 55},
        {title: 'Completed/Attempted', key: 'ca', width : 93},
        {title: 'Final Result', key: 'result', width : 124}, 
        {title: 'Judge Initial', key: 'js', width : 52},
        {title: 'Player Sign', key: 'ps', width : 52}
    ];

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

    function attemptsOptions(doc, yStart, yPlus, headerSpacing) {
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
                    doc.text('/', x + 43, y);
                } else {
                    doc.text('' + value, x + settings.padding, y);
                }
            }
        };
    }

    function headerSpacing(x, key, doc) {
        switch (key) {
            case 'start':
                x += 3;
            case 'stop':
                x += 2;
            case 'in':
            case 'ss':
                doc.setFontSize(8);
                x += 5;
                break;
            case 'result':
                x += 9;
            case 'time':
                x += 22;
                doc.setFontSize(11);
                break;
            case 'js':
                doc.setFontSize(8.5);
                x += 7;
                break;
            case 'ps':
                doc.setFontSize(8.5);
                x += 8;
                break;
        }
        return x;
    }

    function MBFHeaderSpacing(x, key, doc) {
        switch (key) {
            case 'ca':
                x += 0.5;
            case 'start':
            case 'stop':
            case 'ss':
                x += 6;
                doc.setFontSize(8);
                break;
            case 'tl':
                x += 7;
            case 'pn':
                x += 6;
                doc.setFontSize(11);
                break;
            case 'result':
                x += 9;
            case 'time':
                x += 21;
                doc.setFontSize(11);
                break;
            case 'js':
                doc.setFontSize(8.5);
                x += 4;
                break;
            case 'ps':
                doc.setFontSize(8.5);
                x += 5;
                break;
        }
        return x;    
    }

}
