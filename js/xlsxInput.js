var xlsxArray;
$(function(){
    var xlf = document.getElementById('xlf');
    
    function handleFile(e) {
        var files = e.target.files;
        var file = files[0];
        process(file);
    }

    xlf.addEventListener('change', handleFile, false);

    function process(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var data = e.target.result;
            var arr = fixdata(data);
            var wb = XLSX.read(btoa(arr), {type: 'base64'});
            xlsxArray = to_array(wb);
        };
        reader.readAsArrayBuffer(file);
    }

    function fixdata(data) {
        var o = '', l = 0, w = 10240;
        for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
        o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
        return o;
    }

    function to_array(workbook) {
        var result = [];
        workbook.SheetNames.forEach(function(sheetName) {
            var csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
            array = csv.csvToArray({rSep:'\n'});
            if(csv.length > 0){
                result[sheetName] = array;
            }
        });
        return result;
    }
});