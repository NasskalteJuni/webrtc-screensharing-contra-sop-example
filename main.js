const url = "url-field";
const keywords = "keyword-list-field";
const display = "results-container";
var tmp = null;

function getUrl(){
    return document.getElementById(url).value;
}

function getKeywords(){
    return document.getElementById(keywords).value.split(",")
        .map(function(word){ return word.trim(); })
        .reduce(function(words, word){ if(word.length > 0) words.push(word); return words; }, []);
}

function showResults(result){
    const container = document.getElementById(display);
    const escape = function(string){ return string.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); };
    const toPoint = function(pair){ return '<tr><td class="key">'+escape(pair.word)+'</td><td class="value">'+escape(pair.proposed !== null ? pair.proposed : '-')+'</td></tr>'}
    container.innerHTML =  '<article class="text>">'+escape(result.fulltext)+'</article>';
    if(result.matches.length > 0){
        container.innerHTML += '<br> <table><thead><tr><th class="key">Schlüsselwort</th><th>Nachfolgender Wert</th></tr></thead><tbody>' + result.matches.map(toPoint) + '</tbody>';
    }
    container.innerHTML += '<br> Screenshot: <br>' + result.image.outerHTML;
}

/**
 * Load the embedded page in an iFrame but without the iFrame being visible
 * @param url the url of the external website (VP)
 * @return Promise resolves when the page is preloaded, rejects, when an error occurs
 * */
function preloadExternalPage(url){
    const iframe = document.createElement("iframe");
    iframe.style.width = window.innerWidth + 'px';
    iframe.style.height = window.innerHeight + 'px';
    iframe.style.zIndex = "1";
    iframe.style.position = "fixed";
    iframe.style.top = "0px";
    iframe.style.left = "0px";
    iframe.style.margin = "0px";
    iframe.style.overflow = "none";
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    iframe.src = url;
    tmp = iframe;
    return new Promise(function(resolve, reject){
        iframe.onload = resolve;
        iframe.onerror = reject;
    });
}


/**
 * Displays the preloaded external page, must be called after preloadExternalPage
 * @param Number [optional] minDelayTime (in ms) since the MediaStream received is a delayed version of the current page, guess a fitting delay time that prolongs this method call
 * @return Promise resolves after the given delay
 * */
function showExternalPage(minDelayTime){
    minDelayTime = minDelayTime || 1;
    tmp.style.display = "block";
    return new Promise(function(resolve){
        setTimeout(function(){
            resolve();
        }, minDelayTime);
    });
}

/**
 * Hides and removes the displayed external page
 * */
function removeExternalPage(){
    // remove possible iframe
    if(tmp)document.body.removeChild(tmp);
    tmp = null;
}

function getScreenCapture(){
    // settings for using the screen as stream source
    var browser = navigator.userAgent.toLowerCase().match(/(opera|chrome|safari|firefox|msie)[\/\s]*([\d\.]+)/)[1];
    const videoConstraints = {
        video: browser === "chrome" ? {mandatory: {chromeMediaSource: "screen"}} : {mediaSource: "screen"},
        audio: false
    };
    // invoke the screencapture
    return navigator.mediaDevices.getUserMedia(videoConstraints)
}

function getImageFromStream(stream){
    const capture = new ImageCapture(stream.getVideoTracks()[0]);
    return capture.grabFrame().then(function(bitmap){
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
        const image = new Image();
        image.width = bitmap.width;
        image.height = bitmap.height;
        image.src = canvas.toDataURL();
        return image;
    });
}

/**
 * takes an image and possible keywords, returns the text contained in the image and the words after the keywords, if specified
 * @param image ImageObject (can be an html img-element or something similar)
 * @param keywordMatches Array of words that are searched in the recognized text
 * @return Object gives the result of the analysis, containing the given image (attribute: image), the fulltext (attribute: fulltext) and the matched keywords (attribute: matches)
 * */
function analyzeImageText(image, keywordMatches){
    if(!keywordMatches) keywordMatches = [];
    // let the tesseract ocr analyze the image (the weird Promise.resolve is due to the fact, that tessaract uses promise alikes, that do not chain like real ones)
    return Promise.resolve(Tesseract.recognize(image))
        .then(function(result){
            // get the words of the text and return fulltext and words
            return Promise.resolve({
                image: image,
                analysis: result,
                fulltext: result.text,
                matches: keywordMatches.map(function(keyword){
                    const found = result.words.indexOf(keyword);
                    return {
                        word: keyword,
                        proposed: found >= 0 && found < words.length - 1 ? words[found] : null
                    }
                })
            });
        })
        .catch(console.error);
}

/**
 * main method that displays a specified page for a short time in an iFrame,
 * captures the image and gives it to an OCR that shows the recognized text.
 * logs occuring errors to console.
 * */
function main(){
    preloadExternalPage(getUrl())
        .then(getScreenCapture)
        .then(function(stream){
            return showExternalPage(200).then(function(){ return stream; });  // show the page for at least 200 ms
        })
        .then(getImageFromStream)
        .then(function(image){
            removeExternalPage();
            return image;
        })
        .then(function(image){
            return analyzeImageText(image, getKeywords())
        })
        .then(showResults)
        .catch(console.error);
}
