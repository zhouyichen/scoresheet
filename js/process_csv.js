var csvInput = document.getElementById('csv');
csvInput.addEventListener('change', readFile, false);
var regList;

function readFile (evt) {
    var files = evt.target.files;
    var file = files[0];           
    var reader = new FileReader();
    reader.onload = function() {
        var csv = this.result;
        regList = csv.csvToArray({rSep:'\n'});      
    }
    reader.readAsText(file);
}

