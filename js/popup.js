var background = chrome.extension.getBackgroundPage();
var glyphClass;

$(document).ready(function(){
	$('[data-toggle="tooltip"]').tooltip();
});

window.onload = function() {
	
	/* HOME PAGE */
	// Set correct play button
	if(background.isRunning) {
		glyphClass = 'glyphicon glyphicon-pause';
	} else {
		glyphClass = 'glyphicon glyphicon-play';
	};
	document.getElementById('startStopGlyph').className = glyphClass;
	
	// On Start/Stop button click
	document.getElementById('startStop').onclick = function() {
		
		if(background.isRunning) {
			glyphClass = 'glyphicon glyphicon-play';
		} else {
			glyphClass = 'glyphicon glyphicon-pause';
		};
		document.getElementById('startStopGlyph').className = glyphClass;
		
		chrome.extension.sendMessage({text:"startStop"},function(reponse){});
	};	
	
	// On Support/Review button click
	document.getElementById('review').onclick = function() {
		chrome.tabs.create({active:true,url:'https://chrome.google.com/webstore/detail/shuffletab/dgdnnanaohagafffokijmgcfnmhgcmeb/reviews'});
	};
	document.getElementById('support').onclick = function() {
		chrome.tabs.create({active:true,url:'https://chrome.google.com/webstore/detail/shuffletab/dgdnnanaohagafffokijmgcfnmhgcmeb/support'});
	};
	
	
	/* SETTINGS PAGE */
	// Set defaults from background
	// CtrlUp
	if(background.parentWindowIndex == 0)
		document.getElementById('CtrlUp1').checked = true
	else if(background.parentWindowIndex == -1)
		document.getElementById('CtrlUp2').checked = true
	else
		throw "Unknown parentWindowIndex value: " + background.parentWindowIndex
	
	if(background.retainPosition)
		document.getElementById('CtrlUp3').checked = true
	
	if(!background.skipFirst)
		document.getElementById('CtrlUp4').checked = true
	
	// CtrlDown
	if(background.newWindowIndex == 0)
		document.getElementById('CtrlDown1').checked = true
	else if(background.newWindowIndex == -1)
		document.getElementById('CtrlDown2').checked = true
	else
		throw "Unknown newWindowIndex value: " + background.newWindowIndex
	
	switch(background.movementMode) {
		case -1:
			document.getElementById('CtrlDown3').checked = true
			break
		case 0:
			document.getElementById('CtrlDown4').checked = true
			break
		case 1:
			document.getElementById('CtrlDown5').checked = true
			break
		default:
			throw "Unknown movementMode: " + background.movementMode		
	}
	
	
	// Set onClick events
	/* CtrlUp */
	//toDo: add in warning if retainposition active
	document.getElementById('CtrlUp1').onclick = function() {
		chrome.extension.sendMessage({text:"parentPosition",value:0})
	}
	document.getElementById('CtrlUp2').onclick = function() {
		chrome.extension.sendMessage({text:"parentPosition",value:-1})
	}
	
	document.getElementById('CtrlUp3').onclick = function() {
		chrome.extension.sendMessage({text:"retainPosition"})
	}
	
	document.getElementById('CtrlUp4').onclick = function() {
		chrome.extension.sendMessage({text:"skipFirst"})
	}
	
	/* CtrlDown */
	document.getElementById('CtrlDown1').onclick = function() {
		chrome.extension.sendMessage({text:"childPosition",value:0})
	}
	document.getElementById('CtrlDown2').onclick = function() {
		chrome.extension.sendMessage({text:"childPosition",value:-1})
	}
	
	document.getElementById('CtrlDown3').onclick = function() {
		chrome.extension.sendMessage({text:"movementMode",value:-1})
	}
	document.getElementById('CtrlDown4').onclick = function() {
		chrome.extension.sendMessage({text:"movementMode",value:0})
	}
	document.getElementById('CtrlDown5').onclick = function() {
		chrome.extension.sendMessage({text:"movementMode",value:1})
	}
	

};