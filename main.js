const url = "url-field";
const keywords = "keyword-list-field";
const display = "results-container";
var tmp = null;

function getUrl(){
    return document.getElementById(url).value;
}

function getKeywords(){
    return document.getElementById(keywords).value.split(",").map(function(el){ return el.trim(); });
}

function showResults(results){
    const escape = function(string){ return string.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); };
    const toPoint = function(pair){ return '<tr><td class="key">'+escape(pair.keyword)+'</td><td class="value">'+escape(pair.proposed !== null ? pair.value : '-')+'</td></tr>'}
    document.getElementById(display).innerHTML = '<table><thead><tr><th class="key">Schlüsselwort</th><th></th></tr></thead><tbody>' + results.matches.map(toPoint) + '</tbody><article class="text>">'+results.fulltext+'</article>';
}

function showExternalPage(url){
    // show iframe of page
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.width = "100vw";
    iframe.style.height = "100vh";
    iframe.style.zIndex = "1";
    iframe.style.position = "fixed";
    document.body.appendChild(iframe);
    tmp = iframe;
}

function hideExternalPage(){
    // remove possible iframe
    if(tmp)document.body.removeChild(tmp);
    tmp = null;
}


function makeScreenShot(){
    // settings for using the screen as stream source
    const videoConstraints = {
        video: {
            mediaSource: "screen"
        },
        audio: false
    };
    // invoke the screencapture
    return navigator.mediaDevices.getUserMedia(videoConstraints)
        .then(function(stream){
            // settings for screenshot instead of photo
            const photoConstraints = {
                // fillLightMode: "off",
                // redEyeReduction: false
            };
            // capture single image raw data from stream
            // see also: https://w3c.github.io/mediacapture-image/#imagecaptureapi
            const capture = new ImageCapture(stream.getVideoTracks()[0]);
            return capture.takePhoto(photoConstraints)
                .then(function(blobData){
                    console.log(blobData)
                    const screenshot = new Image();
                    screenshot.srcObject = blobData;
                    return screenshot;
                });
        })
        .catch(console.error)
}

function analyzeImageText(image, keywordMatches){
    keywordMatches = keywordMatches || [];
    // let the tesseract ocr analyze the image
    Tesseract.recognize(image)
        .then(function(result){
            // get the words of the text and return fulltext and words
            const words = result.split(/\w+/g);
            return {
                fulltext: result,
                matches: keywordMatches.map(function(keyword){
                    const found = words.indexOf(keyword);
                    return {
                        word: keyword,
                        proposed: found >= 0 && found < words.length - 1 ? words[found] : null
                    }
                })
            };
        })
        .catch(console.error);
}

function main(){
    showExternalPage(getUrl());
    makeScreenShot()
        .then(function(image){
            console.log(image);
            hideExternalPage();
            return analyzeImageText(image, getKeywords())
        })
        .then(showResults);
}
